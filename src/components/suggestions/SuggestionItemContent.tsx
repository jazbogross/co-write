
import React, { useState, useEffect } from 'react';
import { DiffManager, DiffChange } from '@/utils/diff';
import { SuggestionDiffView } from '@/components/editor/SuggestionDiffView';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';
import { extractPlainTextFromDelta } from '@/utils/editor';
import { LineData } from '@/types/lineTypes';

interface SuggestionItemContentProps {
  originalContent: string;
  suggestedContent: string;
}

export const SuggestionItemContent: React.FC<SuggestionItemContentProps> = ({
  originalContent,
  suggestedContent
}) => {
  const [showDiff, setShowDiff] = useState(false);
  const [diffChanges, setDiffChanges] = useState<DiffChange[]>([]);
  
  // Generate diff changes on component mount
  useEffect(() => {
    // Create simple LineData objects for the DiffManager
    const originalLine: LineData = { 
      content: originalContent,
      uuid: 'original',
      lineNumber: 1
    };
    const suggestedLine: LineData = {
      content: suggestedContent,
      uuid: 'original', // Same UUID to match
      lineNumber: 1
    };
    
    // Generate diff using DiffManager
    const diffMap = DiffManager.generateDiff([originalLine], [suggestedLine]);
    
    // Extract the changes - this is simplified for this component
    // In a real app, we'd properly convert LineDiff to DiffChange[]
    const changes: DiffChange[] = [{
      type: diffMap['original'].changeType === 'unchanged' ? 'equal' : 
           (diffMap['original'].changeType === 'addition' ? 'add' : 
           (diffMap['original'].changeType === 'deletion' ? 'delete' : 'modify')),
      text: extractPlainTextFromDelta(suggestedLine.content),
      index: 0,
      originalText: extractPlainTextFromDelta(originalLine.content)
    }];
    
    setDiffChanges(changes);
  }, [originalContent, suggestedContent]);
  
  // Toggle diff view
  const toggleDiff = () => setShowDiff(!showDiff);
  
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
          originalContent={originalContent}
          suggestedContent={suggestedContent}
          diffChanges={diffChanges}
        />
      ) : (
        <div className="bg-gray-50 p-2 rounded border whitespace-pre-wrap">
          {suggestedContent}
        </div>
      )}
      
      {!showDiff && (
        <div className="mt-2">
          <h4 className="text-sm font-medium mb-1">Original Content</h4>
          <div className="bg-gray-100 p-2 rounded border whitespace-pre-wrap">
            {originalContent}
          </div>
        </div>
      )}
    </div>
  );
};
