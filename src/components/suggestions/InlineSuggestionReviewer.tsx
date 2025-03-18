
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DeltaStatic } from 'quill';
import { Check, X, ChevronRight, ChevronLeft, User } from 'lucide-react';
import { extractPlainTextFromDelta } from '@/utils/editor';
import { SuggestionDiffView } from '@/components/editor/SuggestionDiffView';
import { analyzeDeltaDifferences } from '@/utils/diff/contentDiff';
import { fetchUserProfiles } from '@/services/suggestionService';

interface InlineSuggestionReviewerProps {
  scriptId: string;
  suggestions: any[];
  onAction: (suggestionId: string, action: 'approve' | 'reject', reason?: string) => Promise<void>;
}

export const InlineSuggestionReviewer: React.FC<InlineSuggestionReviewerProps> = ({
  scriptId,
  suggestions,
  onAction
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  
  // Fetch usernames when component mounts
  React.useEffect(() => {
    const loadUsernames = async () => {
      try {
        const userIds = [...new Set(suggestions.map(s => s.user_id))];
        const profiles = await fetchUserProfiles(userIds);
        setUsernames(profiles);
      } catch (error) {
        console.error('Error loading user profiles:', error);
      }
    };
    
    if (suggestions.length > 0) {
      loadUsernames();
    }
  }, [suggestions]);
  
  if (suggestions.length === 0) {
    return null;
  }
  
  const currentSuggestion = suggestions[currentIndex];
  
  // Extract diff information
  const getDisplayDiff = () => {
    try {
      if (!currentSuggestion?.delta_diff) return { original: '', suggested: '', changes: [] };
      
      // Convert delta_diff to plain text differences
      const deltaOps = currentSuggestion.delta_diff.ops || [];
      let deletedText = '';
      let addedText = '';
      
      deltaOps.forEach(op => {
        if (op.delete) {
          deletedText += ''.padEnd(op.delete, '-');
        } else if (op.insert) {
          addedText += typeof op.insert === 'string' ? op.insert : '';
        }
      });
      
      const { changes } = analyzeDeltaDifferences(deletedText || ' ', addedText || ' ');
      
      return {
        original: deletedText || ' ',
        suggested: addedText || ' ',
        changes
      };
    } catch (error) {
      console.error('Error analyzing diff:', error);
      return { original: '', suggested: '', changes: [] };
    }
  };
  
  const diff = getDisplayDiff();
  
  const handleNext = () => {
    setCurrentIndex(prev => Math.min(prev + 1, suggestions.length - 1));
  };
  
  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(prev - 1, 0));
  };
  
  const handleApprove = async () => {
    await onAction(currentSuggestion.id, 'approve');
    
    // Move to next suggestion if available, otherwise reset to first
    if (currentIndex >= suggestions.length - 1) {
      setCurrentIndex(0);
    }
  };
  
  const handleReject = async () => {
    setShowRejectDialog(true);
  };
  
  const submitRejection = async () => {
    await onAction(currentSuggestion.id, 'reject', rejectionReason);
    setShowRejectDialog(false);
    setRejectionReason('');
    
    // Move to next suggestion if available, otherwise reset to first
    if (currentIndex >= suggestions.length - 1) {
      setCurrentIndex(0);
    }
  };
  
  const username = usernames[currentSuggestion.user_id] || 'Unknown user';
  
  return (
    <>
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex justify-between items-center">
            <div className="flex items-center">
              <span>Suggestion {currentIndex + 1} of {suggestions.length}</span>
              <div className="flex mx-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handlePrevious}
                  disabled={currentIndex === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleNext}
                  disabled={currentIndex === suggestions.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex items-center text-sm font-normal">
              <User className="h-4 w-4 mr-1" />
              <span>{username}</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <SuggestionDiffView
            originalContent={diff.original}
            suggestedContent={diff.suggested}
            diffChanges={diff.changes}
          />
        </CardContent>
        <CardFooter className="flex justify-end space-x-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
            onClick={handleReject}
          >
            <X className="h-4 w-4 mr-1" />
            Reject
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-green-600 border-green-200 hover:bg-green-50"
            onClick={handleApprove}
          >
            <Check className="h-4 w-4 mr-1" />
            Approve
          </Button>
        </CardFooter>
      </Card>
      
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Suggestion</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this suggestion.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection"
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={submitRejection}
              disabled={!rejectionReason.trim()}
            >
              Reject Suggestion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
