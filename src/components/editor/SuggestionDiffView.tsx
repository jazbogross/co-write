
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
  lineNumber
}) => {
  // Calculate actual line numbers accounting for insertions and deletions
  const getAdjustedLineNumbers = () => {
    const originalLines = originalContent.split('\n');
    const suggestedLines = suggestedContent.split('\n');
    
    // Sort changes by line number for proper line number tracking
    const sortedChanges = [...diffChanges].sort((a, b) => {
      return (a.lineNumber || 0) - (b.lineNumber || 0);
    });
    
    // Map line numbers between original and suggested content
    let lineOffset = 0;
    
    return sortedChanges.map(change => {
      const originalLineNumber = change.lineNumber || 1;
      const suggestedLineNumber = originalLineNumber + lineOffset;
      
      // Update offset based on changes
      if (change.type === 'add') {
        lineOffset += 1;
      } else if (change.type === 'delete') {
        lineOffset -= 1;
      }
      
      return {
        ...change,
        originalLineNumber,
        suggestedLineNumber
      };
    });
  };
  
  const getContextLinesForChange = (change: DiffChange, lines: string[]): ContextLine[] => {
    const changeLineIndex = (change.lineNumber || 1) - 1;
    const startIndex = Math.max(0, changeLineIndex - 1);
    const endIndex = Math.min(lines.length - 1, changeLineIndex + 1);
    
    const contextLines: ContextLine[] = [];
    
    // Add lines before the change as context
    if (startIndex < changeLineIndex) {
      contextLines.push({
        lineNumber: startIndex + 1,
        text: lines[startIndex],
        type: 'context',
        originalLineNumber: startIndex + 1,
        suggestedLineNumber: startIndex + 1
      });
    }
    
    // Add the changed line with proper line numbers
    if (change.type === 'delete' || change.type === 'modify') {
      contextLines.push({
        lineNumber: changeLineIndex + 1,
        text: change.originalText || '',
        type: 'deleted',
        originalLineNumber: change.originalLineNumber
      });
    }
    
    if (change.type === 'add' || change.type === 'modify') {
      contextLines.push({
        lineNumber: change.type === 'add' 
          ? (change.suggestedLineNumber || changeLineIndex + 1)
          : changeLineIndex + 1,
        text: change.text,
        type: 'added',
        suggestedLineNumber: change.suggestedLineNumber
      });
    }
    
    // Add lines after the change as context
    if (endIndex > changeLineIndex) {
      // For the after-context line, we need to adjust based on if we're adding or removing lines
      const afterLineNumber = endIndex + 1;
      const afterLineSuggestedNumber = change.type === 'add' 
        ? afterLineNumber + 1 
        : (change.type === 'delete' ? afterLineNumber - 1 : afterLineNumber);
      
      contextLines.push({
        lineNumber: afterLineNumber,
        text: lines[endIndex],
        type: 'context',
        originalLineNumber: afterLineNumber,
        suggestedLineNumber: afterLineSuggestedNumber
      });
    }
    
    return contextLines;
  };
  
  // Get all context lines for all changes with adjusted line numbers
  const getAllContextWithChanges = () => {
    const originalLines = originalContent.split('\n');
    const suggestedLines = suggestedContent.split('\n');
    let allContextLines: ContextLine[] = [];
    
    // Process each change with its context
    const adjustedChanges = getAdjustedLineNumbers();
    
    adjustedChanges.forEach(change => {
      const contextForChange = getContextLinesForChange(change, originalLines);
      
      // Avoid duplicating lines that are already in the result
      contextForChange.forEach(line => {
        // Check for duplicates more carefully considering line numbers and types
        const duplicateIndex = allContextLines.findIndex(
          existing => 
            (existing.type === line.type) &&
            ((existing.originalLineNumber === line.originalLineNumber && line.originalLineNumber) ||
             (existing.suggestedLineNumber === line.suggestedLineNumber && line.suggestedLineNumber))
        );
        
        if (duplicateIndex === -1) {
          allContextLines.push(line);
        }
      });
    });
    
    // Sort lines by line number, ensuring deleted lines come before added lines at the same position
    allContextLines.sort((a, b) => {
      if (a.lineNumber !== b.lineNumber) {
        return a.lineNumber - b.lineNumber;
      }
      
      // For same line number, show deleted before added
      if (a.type === 'deleted' && b.type === 'added') {
        return -1;
      }
      if (a.type === 'added' && b.type === 'deleted') {
        return 1;
      }
      
      return 0;
    });
    
    return allContextLines;
  };
  
  const contextWithChanges = getAllContextWithChanges();
  
  // Extract removed and added content for the summary section
  const removedContent = diffChanges
    .filter(c => c.type === 'delete' || c.type === 'modify')
    .map(c => c.originalText)
    .filter(Boolean)
    .join('\n');
    
  const addedContent = diffChanges
    .filter(c => c.type === 'add' || c.type === 'modify')
    .map(c => c.text)
    .filter(Boolean)
    .join('\n');
  
  return (
    <div className="border">
      <div>
        <ScrollArea className="h-[400px]">
          <div className="font-mono text-sm">
            {contextWithChanges.map((line, index) => {
              const prevLine = contextWithChanges[index - 1];
              
              // Calculate display line number based on line type
              const displayNumber = line.type === 'deleted' 
                ? line.originalLineNumber 
                : (line.type === 'added' ? line.suggestedLineNumber : line.lineNumber);
              
              // Calculate if we need to show ellipsis (gap in line numbers)
              const hasGap = index > 0 && prevLine && 
                Math.abs((displayNumber || 0) - (
                  prevLine.type === 'deleted' 
                    ? (prevLine.originalLineNumber || 0) 
                    : (prevLine.type === 'added' 
                      ? (prevLine.suggestedLineNumber || 0) 
                      : (prevLine.lineNumber || 0))
                )) > 1;
              
              return (
                <React.Fragment key={index}>
                  {hasGap && (
                    <div className="my-2 text-center text-white">...</div>
                  )}
                  <div className="flex">
                    <div className="w-10 text-white select-none tabular-nums">
                      {displayNumber}
                    </div>
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
    </div>
  );
};
