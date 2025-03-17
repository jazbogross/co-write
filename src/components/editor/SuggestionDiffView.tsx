import React from 'react';
import { DiffChange } from '@/utils/diff';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
}

interface ContextLine {
  // Unified display number
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
  // Step 1: Adjust diff changes by assigning explicit line numbers using separate counters.
  const getAdjustedDiffChanges = () => {
    let originalCounter = 1;
    let suggestedCounter = 1;
    return diffChanges.map(change => {
      if (change.type === 'add') {
        const adjusted = { ...change, suggestedLineNumber: suggestedCounter };
        suggestedCounter++;
        return adjusted;
      } else if (change.type === 'delete') {
        const adjusted = { ...change, originalLineNumber: originalCounter };
        originalCounter++;
        return adjusted;
      } else if (change.type === 'modify') {
        const adjusted = {
          ...change,
          originalLineNumber: originalCounter,
          suggestedLineNumber: suggestedCounter,
        };
        originalCounter++;
        suggestedCounter++;
        return adjusted;
      } else {
        // For 'equal' or other types, assign both
        const adjusted = {
          ...change,
          originalLineNumber: originalCounter,
          suggestedLineNumber: suggestedCounter,
        };
        originalCounter++;
        suggestedCounter++;
        return adjusted;
      }
    });
  };

  const adjustedChanges = getAdjustedDiffChanges();

  // Step 2: Generate context lines for each change.
  // For additions, we use suggested content; for deletions/modifications, we use original.
  const getContextLinesForChange = (
    change: DiffChange & { originalLineNumber?: number; suggestedLineNumber?: number },
    originalLines: string[],
    suggestedLines: string[]
  ): ContextLine[] => {
    let refIndex: number;
    let source: string[];
    if (change.type === 'add') {
      refIndex = change.suggestedLineNumber! - 1;
      source = suggestedLines;
    } else {
      refIndex = change.originalLineNumber! - 1;
      source = originalLines;
    }
    const startIndex = Math.max(0, refIndex - 1);
    const endIndex = Math.min(source.length - 1, refIndex + 1);
    const contextLines: ContextLine[] = [];

    // Before-context
    if (refIndex > 0) {
      contextLines.push({
        lineNumber: startIndex + 1,
        text: source[startIndex],
        type: 'context',
        originalLineNumber: source === originalLines ? startIndex + 1 : undefined,
        suggestedLineNumber: source === suggestedLines ? startIndex + 1 : undefined,
      });
    }

    // Changed line(s)
    if (change.type === 'delete' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.originalLineNumber!,
        text: change.originalText || '',
        type: 'deleted',
        originalLineNumber: change.originalLineNumber,
      });
    }
    if (change.type === 'add' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.suggestedLineNumber!,
        text: change.text,
        type: 'added',
        suggestedLineNumber: change.suggestedLineNumber,
      });
    }

    // After-context
    if (refIndex < source.length - 1) {
      contextLines.push({
        lineNumber: endIndex + 1,
        text: source[endIndex],
        type: 'context',
        originalLineNumber: source === originalLines ? endIndex + 1 : undefined,
        suggestedLineNumber: source === suggestedLines ? endIndex + 1 : undefined,
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
        // Avoid duplicates based on line numbers and type
        const exists = allContextLines.some(existing => {
          if (line.type === 'deleted') {
            return existing.originalLineNumber === line.originalLineNumber;
          } else if (line.type === 'added') {
            return existing.suggestedLineNumber === line.suggestedLineNumber;
          }
          return existing.lineNumber === line.lineNumber;
        });
        if (!exists) {
          allContextLines.push(line);
        }
      });
    });

    // Sort unified by display number
    allContextLines.sort((a, b) => {
      const aNum =
        a.type === 'deleted'
          ? a.originalLineNumber!
          : a.type === 'added'
          ? a.suggestedLineNumber!
          : a.lineNumber;
      const bNum =
        b.type === 'deleted'
          ? b.originalLineNumber!
          : b.type === 'added'
          ? b.suggestedLineNumber!
          : b.lineNumber;
      return aNum - bNum;
    });
    return allContextLines;
  };

  const contextWithChanges = getAllContextWithChanges();

  // Step 4: Render the diff, inserting a spacer if there’s a gap in line numbers.
  return (
    <div className="border">
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-sm">
          {contextWithChanges.map((line, index) => {
            // Determine display number based on type
            let displayNumber: number;
            if (line.type === 'deleted') {
              displayNumber = line.originalLineNumber!;
            } else if (line.type === 'added') {
              displayNumber = line.suggestedLineNumber!;
            } else {
              displayNumber = line.lineNumber;
            }
            // Check for a gap relative to the previous line
            const prev = contextWithChanges[index - 1];
            let hasGap = false;
            if (prev) {
              const prevNumber =
                prev.type === 'deleted'
                  ? prev.originalLineNumber!
                  : prev.type === 'added'
                  ? prev.suggestedLineNumber!
                  : prev.lineNumber;
              if (Math.abs(displayNumber - prevNumber) > 1) {
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
