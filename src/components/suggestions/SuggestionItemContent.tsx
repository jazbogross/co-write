
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { extractPlainTextFromDelta } from '@/utils/editor';
import { SuggestionDiffView } from '@/components/editor/SuggestionDiffView';
import { analyzeDeltaDifferences } from '@/utils/diff/contentDiff';

interface SuggestionItemContentProps {
  originalContent: string;
  suggestedContent: string;
}

export const SuggestionItemContent: React.FC<SuggestionItemContentProps> = ({
  originalContent,
  suggestedContent
}) => {
  const [showDiff, setShowDiff] = useState(false);
  const [diffData, setDiffData] = useState<{
    original: string;
    suggested: string;
    changes: any[];
    lineNumbers: number[];
  }>({ original: '', suggested: '', changes: [], lineNumbers: [] });
  
  // Toggle diff view
  const toggleDiff = () => setShowDiff(!showDiff);
  
  // Extract plain text if content is Delta
  const getDisplayContent = (content: any): string => {
    if (typeof content === 'string') {
      return content;
    }
    
    return extractPlainTextFromDelta(content);
  };
  
  useEffect(() => {
    const displayOriginal = getDisplayContent(originalContent);
    const displaySuggested = getDisplayContent(suggestedContent);
    
    // Analyze differences to get ALL changes
    const { changes } = analyzeDeltaDifferences(displayOriginal, displaySuggested);
    
    // Extract line numbers from changes
    const lineNumbers = changes.map(change => change.lineNumber || 0).filter(num => num > 0);
    
    setDiffData({
      original: displayOriginal,
      suggested: displaySuggested,
      changes,
      lineNumbers
    });
  }, [originalContent, suggestedContent]);
  
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
        <SuggestionDiffView
          originalContent={diffData.original}
          suggestedContent={diffData.suggested}
          diffChanges={diffData.changes}
        />
      ) : (
        <div className="bg-gray-50 p-2 rounded border whitespace-pre-wrap">
          {diffData.suggested}
        </div>
      )}
      
      {!showDiff && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1">Original Content</h4>
          <div className="bg-gray-100 p-2 rounded border whitespace-pre-wrap">
            {diffData.original}
          </div>
        </div>
      )}
    </div>
  );
};
