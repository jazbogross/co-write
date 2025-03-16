
import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeltaStatic } from 'quill';
import { Suggestion } from './types';
import { approveSuggestion } from '@/services/suggestionService';
import { toast } from 'sonner';
import { SuggestionDiffView } from '@/components/editor/SuggestionDiffView';
import { extractPlainTextFromDelta } from '@/utils/editor';
import { analyzeDeltaDifferences } from '@/utils/diff/contentDiff';

interface SuggestionPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: Suggestion;
  originalContent: DeltaStatic;
  scriptId: string;
  onSuggestionApplied?: () => void;
  onSuccess: () => void;
}

export const SuggestionPreview: React.FC<SuggestionPreviewProps> = ({
  open,
  onOpenChange,
  suggestion,
  originalContent,
  scriptId,
  onSuggestionApplied,
  onSuccess
}) => {
  const [isApplying, setIsApplying] = useState(false);
  const [diffData, setDiffData] = useState<{
    original: string;
    suggested: string;
    changes: any[];
    lineNumber?: number;
  }>({ original: '', suggested: '', changes: [] });
  
  // Analyze differences when suggestion changes
  useEffect(() => {
    if (suggestion && originalContent) {
      // Extract text content
      const originalText = extractPlainTextFromDelta(originalContent);
      const suggestedText = extractPlainTextFromDelta(
        originalContent.compose(suggestion.deltaDiff)
      );
      
      // Analyze the differences
      const { changes, lineNumber } = analyzeDeltaDifferences(originalText, suggestedText);
      
      setDiffData({
        original: originalText,
        suggested: suggestedText,
        changes,
        lineNumber
      });
    }
  }, [suggestion, originalContent]);
  
  // Apply a suggestion
  const handleApplySuggestion = async () => {
    setIsApplying(true);
    
    try {
      // Apply the suggestion
      await approveSuggestion(
        scriptId,
        suggestion.id,
        originalContent,
        suggestion.deltaDiff
      );
      
      toast.success('Suggestion applied successfully');
      
      // Notify parent components
      if (onSuggestionApplied) {
        onSuggestionApplied();
      }
      
      onSuccess();
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('Failed to apply suggestion');
    } finally {
      setIsApplying(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Suggestion Preview</DialogTitle>
        </DialogHeader>
        
        <SuggestionDiffView
          originalContent={diffData.original}
          suggestedContent={diffData.suggested}
          diffChanges={diffData.changes}
          lineNumber={diffData.lineNumber}
        />
        
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Close
          </Button>
          <Button 
            onClick={handleApplySuggestion}
            disabled={isApplying}
          >
            {isApplying ? 'Applying...' : 'Apply Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
