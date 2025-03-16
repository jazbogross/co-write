
import { useState } from 'react';
import { toast } from 'sonner';
import { approveSuggestion, rejectSuggestion } from '@/services/suggestionService';
import { DeltaStatic } from 'quill';
import { SuggestionGroupManager } from '@/utils/diff/SuggestionGroupManager';

export function useSuggestionActions(
  scriptId: string, 
  originalContent: DeltaStatic | null,
  setSuggestions: React.Dispatch<React.SetStateAction<any[]>>,
  loadSuggestions: () => Promise<void>
) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0 || !originalContent) return;
    
    setIsProcessing(true);
    try {
      for (const id of ids) {
        // Find the suggestion in our local state
        // We'll need to get suggestions from outer scope
        // This will be fixed in the refactored useSuggestionManager
        await approveSuggestion(
          scriptId,
          id,
          originalContent,
          null // The diff will be fetched inside the approveSuggestion function
        );
      }

      toast({
        title: "Success",
        description: ids.length > 1 
          ? `${ids.length} suggestions approved` 
          : "Suggestion approved and changes applied",
      });
      
      // Reload suggestions to get fresh data
      loadSuggestions();
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to approve suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    if (!id) return;

    setIsProcessing(true);
    try {
      await rejectSuggestion(id, reason);

      toast({
        title: "Success",
        description: "Suggestion rejected",
      });
      
      // Reload suggestions to get fresh data
      loadSuggestions();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast({
        title: "Error",
        description: "Failed to reject suggestion",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    handleApprove,
    handleReject
  };
}
