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
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges,
  lineNumber
}) => {
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
        type: 'context'
      });
    }
    
    // Add the changed line
    if (change.type === 'delete' || change.type === 'modify') {
      contextLines.push({
        lineNumber: changeLineIndex + 1,
        text: change.originalText || '',
        type: 'deleted'
      });
    }
    
    if (change.type === 'add' || change.type === 'modify') {
      contextLines.push({
        lineNumber: changeLineIndex + 1,
        text: change.text,
        type: 'added'
      });
    }
    
    // Add lines after the change as context
    if (endIndex > changeLineIndex) {
      contextLines.push({
        lineNumber: endIndex + 1,
        text: lines[endIndex],
        type: 'context'
      });
    }
    
    return contextLines;
  };
  
  // Get all context lines for all changes
  const getAllContextWithChanges = () => {
    const lines = originalContent.split('\n');
    let allContextLines: ContextLine[] = [];
    
    // Process each change with its context
    diffChanges.forEach(change => {
      const contextForChange = getContextLinesForChange(change, lines);
      
      // Avoid duplicating lines that are already in the result
      contextForChange.forEach(line => {
        if (!allContextLines.some(existing => existing.lineNumber === line.lineNumber && existing.type === line.type)) {
          allContextLines.push(line);
        }
      });
    });
    
    // Sort lines by line number
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
              return (
                <React.Fragment key={index}>
                  {index > 0 && (line.lineNumber - prevLine.lineNumber > 1) && (
                    <div className="my-2 text-center text-white">...</div>
                  )}
                  <div className="flex">
                    <div className="w-10 text-white select-none tabular-nums">{line.lineNumber}</div>
                    <div 
                      className={`whitespace-pre-wrap flex-1 ${
                        line.type === 'deleted'
                          ? 'bg-red-50 text-red-800 line-through'
                          : line.type === 'added'
                          ? 'bg-green-50 text-green-800'
                          : 'text-gray-800'
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
