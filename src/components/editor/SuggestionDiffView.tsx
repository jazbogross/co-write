import React from 'react';
import { DiffChange } from '@/utils/diff';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
  lineNumber?: number;
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges,
  lineNumber
}) => {
  // Get context lines (one before and one after changes)
  const getContextWithChanges = () => {
    const lines = originalContent.split('\n');
    const changeLineIndex = lineNumber ? lineNumber - 1 : 0;
    
    // Determine line indexes to show (context + changes)
    const startIndex = Math.max(0, changeLineIndex - 1);
    const endIndex = Math.min(lines.length - 1, changeLineIndex + 1);
    
    // Create context array with line numbers
    const contextLines = [];
    for (let i = startIndex; i <= endIndex; i++) {
      if (i === changeLineIndex) {
        // This is the changed line - highlight changes instead of showing whole line
        const hasDeleted = diffChanges.some(c => c.type === 'delete' || c.type === 'modify');
        const hasAdded = diffChanges.some(c => c.type === 'add' || c.type === 'modify');
        
        if (hasDeleted) {
          const deletedText = diffChanges.find(c => c.type === 'delete' || c.type === 'modify')?.originalText || '';
          contextLines.push({
            lineNumber: i + 1,
            text: deletedText,
            type: 'deleted'
          });
        }
        
        if (hasAdded) {
          const addedText = diffChanges.find(c => c.type === 'add' || c.type === 'modify')?.text || '';
          contextLines.push({
            lineNumber: i + 1,
            text: addedText,
            type: 'added'
          });
        }
      } else {
        // Context line (unchanged)
        contextLines.push({
          lineNumber: i + 1,
          text: lines[i],
          type: 'context'
        });
      }
    }
    
    return contextLines;
  };
  
  const contextWithChanges = getContextWithChanges();
  
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
          <div className="text-red-800 line-through">{diffChanges.find(c => c.type === 'delete' || c.type === 'modify')?.originalText || 'No removals'}</div>
        </div>
        <div className="bg-green-50 p-3 rounded border">
          <div className="text-sm font-medium text-green-700">Added:</div>
          <div className="text-green-800">{diffChanges.find(c => c.type === 'add' || c.type === 'modify')?.text || 'No additions'}</div>
        </div>
      </div>
    </div>
  );
};
