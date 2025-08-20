
import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { approveSuggestion, rejectSuggestion } from '@/services/suggestionService';
import { useQueryClient } from '@tanstack/react-query';

export const useSuggestionActions = (scriptId: string, onSuggestionUpdated?: () => void) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const queryClient = useQueryClient();

  const handleApproveSuggestion = useCallback(async (
    suggestionId: string,
    originalContent: any
  ) => {
    setIsProcessing(true);
    
    try {
      const success = await approveSuggestion(scriptId, suggestionId, originalContent);
      
      if (success) {
        toast.success('Suggestion approved successfully');
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ['suggestions', scriptId]
        });
        
        queryClient.invalidateQueries({
          queryKey: ['scriptContent', scriptId]
        });
        
        // Call the callback if provided
        if (onSuggestionUpdated) {
          onSuggestionUpdated();
        }
        
        return true;
      } else {
        toast.error('Failed to approve suggestion');
        return false;
      }
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error('An error occurred while approving suggestion');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [scriptId, queryClient, onSuggestionUpdated]);

  const handleRejectSuggestion = useCallback(async (
    suggestionId: string,
    reason: string
  ) => {
    setIsProcessing(true);
    
    try {
      const success = await rejectSuggestion(suggestionId, reason);
      
      if (success) {
        toast.success('Suggestion rejected successfully');
        
        // Invalidate suggestions query
        queryClient.invalidateQueries({
          queryKey: ['suggestions', scriptId]
        });
        
        // Call the callback if provided
        if (onSuggestionUpdated) {
          onSuggestionUpdated();
        }
        
        return true;
      } else {
        toast.error('Failed to reject suggestion');
        return false;
      }
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error('An error occurred while rejecting suggestion');
      return false;
    } finally {
      setIsProcessing(false);
    }
  }, [scriptId, queryClient, onSuggestionUpdated]);

  return {
    handleApproveSuggestion,
    handleRejectSuggestion,
    isProcessing
  };
};
