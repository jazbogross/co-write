
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { extractPlainTextFromDelta } from '@/utils/editor';

interface SuggestionItemContentProps {
  originalContent: string;
  suggestedContent: string;
}

export const SuggestionItemContent: React.FC<SuggestionItemContentProps> = ({
  originalContent,
  suggestedContent
}) => {
  const [showDiff, setShowDiff] = useState(false);
  
  // Toggle diff view
  const toggleDiff = () => setShowDiff(!showDiff);
  
  // Extract plain text if content is Delta
  const getDisplayContent = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }
    
    return extractPlainTextFromDelta(content);
  };
  
  const displayOriginal = getDisplayContent(originalContent);
  const displaySuggested = getDisplayContent(suggestedContent);
  
  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">Suggested Change</h4>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={toggleDiff}
          className="h-8 px-2"
        >
          {showDiff ? (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              <span className="text-xs">Hide Diff</span>
            </>
          ) : (
            <>
              <Eye className="h-4 w-4 mr-1" />
              <span className="text-xs">Show Diff</span>
            </>
          )}
        </Button>
      </div>
      
      {showDiff ? (
        <div className="space-y-2">
          <div className="bg-red-50 border-l-4 border-red-400 pl-2 p-2 rounded">
            <div className="text-xs font-medium text-red-700 mb-1">Removed:</div>
            <pre className="whitespace-pre-wrap text-sm">{displayOriginal}</pre>
          </div>
          <div className="bg-green-50 border-l-4 border-green-400 pl-2 p-2 rounded">
            <div className="text-xs font-medium text-green-700 mb-1">Added:</div>
            <pre className="whitespace-pre-wrap text-sm">{displaySuggested}</pre>
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 p-2 rounded border whitespace-pre-wrap">
          {displaySuggested}
        </div>
      )}
      
      {!showDiff && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1">Original Content</h4>
          <div className="bg-gray-100 p-2 rounded border whitespace-pre-wrap">
            {displayOriginal}
          </div>
        </div>
      )}
    </div>
  );
};
