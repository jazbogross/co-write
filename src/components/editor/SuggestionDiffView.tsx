import React from 'react';
import { DiffChange } from '@/utils/diff';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
}

interface ContextLine {
  // This is our unified line number for display (may be from original or suggested)
  lineNumber: number;
  text: string;
  type: 'context' | 'deleted' | 'added';
  originalLineNumber?: number;
  suggestedLineNumber?: number;
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges,
}) => {
  // Step 1: Adjust diff changes to track original and suggested line numbers.
  const getAdjustedDiffChanges = () => {
    let lineOffset = 0;
    // Sort by the diff's index.
    const sorted = [...diffChanges].sort((a, b) => a.index - b.index);
    return sorted.map(change => {
      // For deletions and modifications, we have an original line.
      const originalLineNumber = change.type !== 'add' ? change.index + 1 : undefined;
      // For additions and modifications, compute the suggested line number (adjusted by offset)
      const suggestedLineNumber = change.type !== 'delete' ? change.index + 1 + lineOffset : undefined;
      // Update offset based on the change type.
      if (change.type === 'add') {
        lineOffset++;
      } else if (change.type === 'delete') {
        lineOffset--;
      }
      return { ...change, originalLineNumber, suggestedLineNumber };
    });
  };

  const adjustedChanges = getAdjustedDiffChanges();

  // Step 2: For each change, grab one context line before and after.
  // For context, we use original content lines.
  const getContextLinesForChange = (
    change: DiffChange & { originalLineNumber?: number; suggestedLineNumber?: number },
    originalLines: string[],
    suggestedLines: string[]
  ): ContextLine[] => {
    // For a deletion or modification, use the original line number.
    // For an addition, use the suggested line number.
    const refLineNumber =
      change.type === 'add'
        ? (change.suggestedLineNumber || 1) - 1
        : (change.originalLineNumber || change.index + 1) - 1;
    const startIndex = Math.max(0, refLineNumber - 1);
    const endIndex = Math.min(originalLines.length - 1, refLineNumber + 1);
    const contextLines: ContextLine[] = [];

    // Before context (if exists)
    if (refLineNumber > 0) {
      contextLines.push({
        lineNumber: startIndex + 1,
        text: originalLines[startIndex],
        type: 'context',
        originalLineNumber: startIndex + 1,
        suggestedLineNumber: startIndex + 1,
      });
    }

    // The changed line(s)
    if (change.type === 'delete' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.originalLineNumber || refLineNumber + 1,
        text: change.originalText || '',
        type: 'deleted',
        originalLineNumber: change.originalLineNumber,
      });
    }
    if (change.type === 'add' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.suggestedLineNumber || refLineNumber + 1,
        text: change.text,
        type: 'added',
        suggestedLineNumber: change.suggestedLineNumber,
      });
    }

    // After context (if exists)
    if (refLineNumber < originalLines.length - 1) {
      // For simplicity, we use the original content for after-context.
      const afterOriginal = endIndex + 1;
      // If the change was an addition, we adjust the suggested number accordingly.
      const afterSuggested =
        change.type === 'add' ? afterOriginal + 1 : change.type === 'delete' ? afterOriginal - 1 : afterOriginal;
      contextLines.push({
        lineNumber: afterOriginal,
        text: originalLines[endIndex],
        type: 'context',
        originalLineNumber: afterOriginal,
        suggestedLineNumber: afterSuggested,
      });
    }

    return contextLines;
  };

  // Step 3: Collect all context lines from each diff change.
  const getAllContextWithChanges = () => {
    const originalLines = originalContent.split('\n');
    const suggestedLines = suggestedContent.split('\n');
    let allContextLines: ContextLine[] = [];

    adjustedChanges.forEach(change => {
      const contextForChange = getContextLinesForChange(change, originalLines, suggestedLines);
      contextForChange.forEach(line => {
        // Avoid duplicates by checking both original and suggested line numbers.
        const duplicate = allContextLines.some(existing =>
          existing.type === line.type &&
          ((existing.originalLineNumber && line.originalLineNumber && existing.originalLineNumber === line.originalLineNumber) ||
           (existing.suggestedLineNumber && line.suggestedLineNumber && existing.suggestedLineNumber === line.suggestedLineNumber))
        );
        if (!duplicate) {
          allContextLines.push(line);
        }
      });
    });

    // Sort the lines by the unified display number.
    allContextLines.sort((a, b) => {
      const numA =
        a.type === 'deleted'
          ? a.originalLineNumber || a.lineNumber
          : a.suggestedLineNumber || a.lineNumber;
      const numB =
        b.type === 'deleted'
          ? b.originalLineNumber || b.lineNumber
          : b.suggestedLineNumber || b.lineNumber;
      if (numA !== numB) return (numA || 0) - (numB || 0);
      // If two lines share the same number, order deleted lines before added.
      if (a.type === 'deleted' && b.type === 'added') return -1;
      if (a.type === 'added' && b.type === 'deleted') return 1;
      return 0;
    });

    return allContextLines;
  };

  const contextWithChanges = getAllContextWithChanges();

  // Step 4: Render the diff, inserting a spacer when there is a gap in the displayed line numbers.
  return (
    <div className="border">
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-sm">
          {contextWithChanges.map((line, index) => {
            // Decide which number to display based on the type.
            let displayNumber = line.lineNumber;
            if (line.type === 'deleted') {
              displayNumber = line.originalLineNumber;
            } else if (line.type === 'added') {
              displayNumber = line.suggestedLineNumber;
            }
            // Check if there's a gap from the previous line.
            const prev = contextWithChanges[index - 1];
            let hasGap = false;
            if (prev) {
              const prevDisplay =
                prev.type === 'deleted'
                  ? prev.originalLineNumber
                  : prev.type === 'added'
                  ? prev.suggestedLineNumber
                  : prev.lineNumber;
              if (prevDisplay && displayNumber && Math.abs(displayNumber - prevDisplay) > 1) {
                hasGap = true;
              }
            }
            return (
              <React.Fragment key={index}>
                {hasGap && <div className="my-2 text-center text-white">...</div>}
                <div className="flex">
                  <div className="w-10 text-white select-none tabular-nums">{displayNumber}</div>
                  <div
                    className={`whitespace-pre-wrap flex-1 ${
                      line.type === 'deleted'
                        ? 'bg-red-50 text-red-800 line-through'
                        : line.type === 'added'
                        ? 'bg-green-50 text-green-800'
                        : 'text-white'
                    }`}
                  >
                    {line.text}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
