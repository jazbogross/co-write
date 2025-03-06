
import React from 'react';
import { GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';
import { generateLineDiff } from '@/utils/diff/contentDiff';
import { ScrollArea } from '@/components/ui/scroll-area';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

interface UnifiedDiffViewProps {
  suggestion: GroupedSuggestion;
  originalContent?: string;
}

export const UnifiedDiffView: React.FC<UnifiedDiffViewProps> = ({ suggestion, originalContent = '' }) => {
  // Normalize both original and suggestion content to plain text for comparison
  const normalizedOriginal = typeof originalContent === 'string' 
    ? originalContent
    : isDeltaObject(originalContent) 
      ? extractPlainTextFromDelta(originalContent)
      : '';
  
  const normalizedSuggestion = typeof suggestion.content === 'string'
    ? suggestion.content
    : isDeltaObject(suggestion.content)
      ? extractPlainTextFromDelta(suggestion.content)
      : '';
  
  console.log('🔍 UnifiedDiffView normalized content:', {
    originalType: typeof originalContent,
    suggestionType: typeof suggestion.content,
    normalizedOriginal: normalizedOriginal.substring(0, 50) + '...',
    normalizedSuggestion: normalizedSuggestion.substring(0, 50) + '...'
  });
  
  // Generate a diff between the original and suggested content
  const diff = generateLineDiff(normalizedOriginal, normalizedSuggestion);
  
  return (
    <div className="border rounded-md mt-2">
      <div className="bg-gray-100 p-2 text-sm font-medium border-b">
        Unified Diff View
      </div>
      <ScrollArea className="h-[200px]">
        <div className="p-2 font-mono text-sm whitespace-pre-wrap">
          {diff.segments.map((segment, index) => {
            let bgColor = '';
            let prefix = ' ';
            
            switch (segment.type) {
              case 'addition':
                bgColor = 'bg-green-50';
                prefix = '+';
                break;
              case 'deletion':
                bgColor = 'bg-red-50';
                prefix = '-';
                break;
              case 'unchanged':
                bgColor = '';
                prefix = ' ';
                break;
            }
            
            return (
              <div key={index} className={`${bgColor} border-l-4 pl-1 ${
                segment.type === 'addition' ? 'border-green-400' : 
                segment.type === 'deletion' ? 'border-red-400' : 
                'border-gray-200'
              }`}>
                <span className="text-gray-500 mr-2">{prefix}</span>
                {segment.content}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
