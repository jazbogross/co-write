
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { DeltaStatic } from 'quill';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.bubble.css';
import { Suggestion } from './types';
import { approveSuggestion } from '@/services/suggestionService';
import { toast } from 'sonner';

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
        <div className="grid grid-cols-2 gap-4">
          <div className="border p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">Original Content</h3>
            <div className="bg-gray-50 min-h-[300px] p-2 rounded">
              <ReactQuill 
                value={originalContent}
                readOnly
                theme="bubble"
              />
            </div>
          </div>
          <div className="border p-4 rounded-md">
            <h3 className="text-sm font-medium mb-2">With Suggestion Applied</h3>
            <div className="bg-gray-50 min-h-[300px] p-2 rounded">
              <ReactQuill 
                value={originalContent.compose(suggestion.deltaDiff)}
                readOnly
                theme="bubble"
              />
            </div>
          </div>
        </div>
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
