
import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

interface GroupedSuggestion {
  id: string;
  content: any;
  status: string;
  user: {
    username: string;
  };
}

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
  
  // Determine if there are changes
  const hasChanges = normalizedOriginal !== normalizedSuggestion;
  
  return (
    <div className="border mt-2">
      <div className="bg-gray-100 p-2 text-sm font-medium border-b">
        {hasChanges ? 'Changes Found' : 'No Changes'}
      </div>
      <ScrollArea className="h-[200px]">
        <div className="p-2 font-mono text-sm whitespace-pre-wrap">
          {hasChanges ? (
            <>
              <div className="bg-red-50 border-l-4 border-red-400 pl-1 mb-2">
                <span className="text-gray-500 mr-2">-</span>
                {normalizedOriginal}
              </div>
              <div className="bg-green-50 border-l-4 border-green-400 pl-1">
                <span className="text-gray-500 mr-2">+</span>
                {normalizedSuggestion}
              </div>
            </>
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
