import React from 'react';
import { DiffChange } from '@/utils/diff';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
  lineNumber?: number;
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
  // Step 1: Process diff changes and ensure they have proper line numbers
  const getAdjustedDiffChanges = () => {
    // Sort changes by original line number to ensure proper processing order
    const sortedChanges = [...diffChanges].sort((a, b) => {
      return (a.originalLineNumber || 0) - (b.originalLineNumber || 0);
    });

    let lineOffset = 0; // Track cumulative line number changes
    
    return sortedChanges.map((change, idx) => {
      // For each change, calculate the correct line numbers with running offset
      if (change.type === 'add') {
        // Added lines increase line count
        const adjustedChange = {
          ...change,
          suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
        };
        lineOffset += 1;
        return adjustedChange;
      } else if (change.type === 'delete') {
        // Deleted lines decrease line count
        const adjustedChange = {
          ...change,
          suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
        };
        lineOffset -= 1;
        return adjustedChange;
      } else if (change.type === 'modify') {
        // Modified lines keep the same count
        return {
          ...change,
          originalLineNumber: change.originalLineNumber,
          suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
        };
      } else {
        // Equal lines maintain the offset
        return {
          ...change,
          originalLineNumber: change.originalLineNumber,
          suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
        };
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
    // Determine which content and line number to use as reference
    let refIndex: number;
    let source: string[];
    
    if (change.type === 'add') {
      // For additions, reference the suggested line number in suggested content
      refIndex = (change.suggestedLineNumber || 0) - 1;
      source = suggestedLines;
    } else {
      // For deletions/modifications, reference the original line number in original content
      refIndex = (change.originalLineNumber || 0) - 1;
      source = originalLines;
    }
    
    // Ensure we stay within bounds when getting context
    const startIndex = Math.max(0, refIndex - 1);
    const endIndex = Math.min(source.length - 1, refIndex + 1);
    const contextLines: ContextLine[] = [];

    // Add line before (context)
    if (refIndex > 0) {
      contextLines.push({
        lineNumber: startIndex + 1,
        text: source[startIndex],
        type: 'context',
        originalLineNumber: source === originalLines ? startIndex + 1 : undefined,
        suggestedLineNumber: source === suggestedLines ? startIndex + 1 : undefined,
      });
    }

    // Add the actual change
    if (change.type === 'delete' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.originalLineNumber || 0,
        text: change.originalText || '',
        type: 'deleted',
        originalLineNumber: change.originalLineNumber,
      });
    }
    
    if (change.type === 'add' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.suggestedLineNumber || 0,
        text: change.text,
        type: 'added',
        suggestedLineNumber: change.suggestedLineNumber,
      });
    }

    // Add line after (context)
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

    // Process each change to get context lines
    adjustedChanges.forEach(change => {
      const contextForChange = getContextLinesForChange(change, originalLines, suggestedLines);
      
      // Add context lines, avoiding duplicates
      contextForChange.forEach(line => {
        // Check if this line is already in our collection to avoid duplicates
        const exists = allContextLines.some(existing => {
          if (line.type === 'deleted') {
            return existing.originalLineNumber === line.originalLineNumber && existing.type === 'deleted';
          } else if (line.type === 'added') {
            return existing.suggestedLineNumber === line.suggestedLineNumber && existing.type === 'added';
          }
          // For context lines, check both number and content to avoid duplicating context
          return (existing.lineNumber === line.lineNumber && 
                 existing.type === line.type && 
                 existing.text === line.text);
        });
        
        if (!exists) {
          allContextLines.push(line);
        }
      });
    });

    // Sort all lines for display
    allContextLines.sort((a, b) => {
      // Determine display numbers for sorting
      const aNum =
        a.type === 'deleted'
          ? a.originalLineNumber || 0
          : a.type === 'added'
          ? a.suggestedLineNumber || 0
          : a.lineNumber;
      const bNum =
        b.type === 'deleted'
          ? b.originalLineNumber || 0
          : b.type === 'added'
          ? b.suggestedLineNumber || 0
          : b.lineNumber;
      
      return aNum - bNum;
    });
    
    return allContextLines;
  };

  const contextWithChanges = getAllContextWithChanges();

  // Step 4: Render the diff with proper line numbers and visual separators
  return (
    <div className="border">
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-sm">
          {contextWithChanges.map((line, index) => {
            // Determine display number based on type
            let displayNumber: number;
            if (line.type === 'deleted') {
              displayNumber = line.originalLineNumber || 0;
            } else if (line.type === 'added') {
              displayNumber = line.suggestedLineNumber || 0;
            } else {
              displayNumber = line.lineNumber;
            }
            
            // Check for gaps in line numbers to insert a visual separator
            const prev = contextWithChanges[index - 1];
            let hasGap = false;
            
            if (prev) {
              const prevNumber =
                prev.type === 'deleted'
                  ? prev.originalLineNumber || 0
                  : prev.type === 'added'
                  ? prev.suggestedLineNumber || 0
                  : prev.lineNumber;
                  
              // Consider a gap if line numbers aren't sequential
              // but account for add/delete pairs that may have same number
              const isPrevDeleteCurrentAdd = prev.type === 'deleted' && line.type === 'added';
              
              if (!isPrevDeleteCurrentAdd && Math.abs(displayNumber - prevNumber) > 1) {
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
