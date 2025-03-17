
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';
import { GroupedSuggestion } from '@/utils/diff/SuggestionGroupManager';

interface SuggestionGroupItemProps {
  suggestion: GroupedSuggestion;
  onExpand: () => void;
}

export const SuggestionGroupItem: React.FC<SuggestionGroupItemProps> = ({ suggestion, onExpand }) => {
  // Get preview of content
  const getContentPreview = (content: any): string => {
    let textContent: string;
    
    if (typeof content === 'string') {
      try {
        // Try to parse as JSON Delta
        const parsed = JSON.parse(content);
        if (parsed && 'ops' in parsed) {
          textContent = extractPlainTextFromDelta(parsed);
        } else {
          textContent = content;
        }
      } catch {
        textContent = content;
      }
    } else if (isDeltaObject(content)) {
      textContent = extractPlainTextFromDelta(content);
    } else {
      textContent = String(content);
    }
    
    // Truncate and add ellipsis if too long
    return textContent.length > 100
      ? textContent.substring(0, 100) + '...'
      : textContent;
  };
  
  return (
    <div className="flex items-start space-x-3 p-3 border bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center mb-1">
          <span className={`text-xs font-medium px-2 py-0.5   ${
            suggestion.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
            suggestion.status === 'approved' ? 'bg-green-100 text-green-800' :
            'bg-red-100 text-red-800'
          }`}>
            {suggestion.status}
          </span>
        </div>
        <p className="text-sm whitespace-pre-wrap">{getContentPreview(suggestion.content)}</p>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onExpand}
        className="flex-shrink-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};
