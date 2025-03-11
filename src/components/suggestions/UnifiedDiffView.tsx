
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
  // Parse and normalize content for comparison
  const normalizeContent = (content: any): string => {
    if (typeof content === 'string') {
      try {
        // Check if it's stringified JSON/Delta
        const parsed = JSON.parse(content);
        if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
          return extractPlainTextFromDelta(parsed);
        }
      } catch (e) {
        // Not JSON, use as is
        return content;
      }
      return content;
    } else if (isDeltaObject(content)) {
      return extractPlainTextFromDelta(content);
    }
    return String(content);
  };
  
  const normalizedOriginal = normalizeContent(originalContent);
  const normalizedSuggestion = normalizeContent(suggestion.content);
  
  console.log('UnifiedDiffView normalized content:', {
    originalPreview: normalizedOriginal.substring(0, 50) + (normalizedOriginal.length > 50 ? '...' : ''),
    suggestionPreview: normalizedSuggestion.substring(0, 50) + (normalizedSuggestion.length > 50 ? '...' : '')
  });
  
  // Generate a diff between the original and suggested content
  const diff = generateLineDiff(normalizedOriginal, normalizedSuggestion);
  
  // Check if there are actually any changes
  const hasChanges = diff.changeType !== 'unchanged';
  
  return (
    <div className="border rounded-md mt-2">
      <div className="bg-gray-100 p-2 text-sm font-medium border-b">
        {hasChanges ? 'Changes Found' : 'No Changes'}
      </div>
      <ScrollArea className="h-[200px]">
        <div className="p-2 font-mono text-sm whitespace-pre-wrap">
          {hasChanges ? (
            diff.segments.map((segment, index) => {
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
            })
          ) : (
            <div className="text-center py-4 text-gray-500">
              The content is identical
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
