
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
        // Only add if this line number doesn't already exist
        if (!allContextLines.some(existing => existing.lineNumber === line.lineNumber && existing.type === line.type)) {
          allContextLines.push(line);
        }
      });
    });
    
    // Sort lines by line number
    allContextLines.sort((a, b) => {
      // First sort by line number
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
    <div className="border rounded-md p-4 space-y-4">
      <div>
        <h3 className="text-sm font-medium mb-2">Changes with Context</h3>
        <ScrollArea className="h-[200px] rounded border">
          <div className="p-2 font-mono text-sm">
            {contextWithChanges.map((line, index) => (
              <div key={index} className="flex">
                <div className="w-10 text-gray-500 select-none tabular-nums">{line.lineNumber}</div>
                <div 
                  className={`whitespace-pre-wrap flex-1 ${
                    line.type === 'deleted' ? 'bg-red-50 text-red-800 line-through' : 
                    line.type === 'added' ? 'bg-green-50 text-green-800' : 
                    'text-gray-800'
                  }`}
                >
                  {line.text}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-red-50 p-3 rounded border">
          <div className="text-sm font-medium text-red-700">Removed:</div>
          <div className="text-red-800 line-through whitespace-pre-wrap">{removedContent || 'No removals'}</div>
        </div>
        <div className="bg-green-50 p-3 rounded border">
          <div className="text-sm font-medium text-green-700">Added:</div>
          <div className="text-green-800 whitespace-pre-wrap">{addedContent || 'No additions'}</div>
        </div>
      </div>
    </div>
  );
};
