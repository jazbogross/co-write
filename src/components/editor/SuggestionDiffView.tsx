
import React from 'react';
import { DiffChange } from '@/utils/diff';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges,
}) => {
  // Filter out any non-changes to only show actual differences
  const actualChanges = diffChanges.filter(change => 
    change.type === 'add' || change.type === 'delete' || change.type === 'modify'
  );
  
  return (
    <div className="border rounded-md overflow-hidden">
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-sm p-1">
          {actualChanges.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No changes detected
            </div>
          ) : (
            actualChanges.map((change, index) => (
              <div key={index} className="mb-4">
                <div className="py-1 px-2 bg-slate-100 border-b text-xs font-medium">
                  Line {change.lineNumber}
                </div>
                {change.type === 'delete' || change.type === 'modify' ? (
                  <div className="flex">
                    <div className="w-10 text-gray-400 select-none tabular-nums border-r px-2">-</div>
                    <div className="whitespace-pre-wrap flex-1 px-2 bg-red-50 text-red-800 line-through">
                      {change.originalText || ''}
                    </div>
                  </div>
                ) : null}
                {change.type === 'add' || change.type === 'modify' ? (
                  <div className="flex">
                    <div className="w-10 text-gray-400 select-none tabular-nums border-r px-2">+</div>
                    <div className="whitespace-pre-wrap flex-1 px-2 bg-green-50 text-green-800">
                      {change.text}
                    </div>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
