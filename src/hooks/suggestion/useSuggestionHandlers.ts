
import { useState, useCallback } from 'react';
import { Suggestion } from '@/components/suggestions/types';

export function useSuggestionHandlers(
  handleApprove: (suggestionIds: string[]) => Promise<void>,
  handleReject: (suggestionId: string, reason: string) => Promise<void>,
  closeSuggestionPopover: () => void,
  prepareRejectSuggestion: (suggestionId: string) => boolean,
  resetRejectDialog: () => void
) {
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  const handleApproveClick = useCallback(async (suggestionId: string) => {
    closeSuggestionPopover();
    await handleApprove([suggestionId]);
  }, [handleApprove, closeSuggestionPopover]);

  const handleRejectClick = useCallback((suggestionId: string) => {
    if (prepareRejectSuggestion(suggestionId)) {
      setShowRejectDialog(true);
    }
  }, [prepareRejectSuggestion]);

  const handleRejectConfirm = useCallback(async (suggestionId: string | null, rejectionReason: string) => {
    if (suggestionId) {
      await handleReject(suggestionId, rejectionReason);
      setShowRejectDialog(false);
      resetRejectDialog();
    }
  }, [handleReject, resetRejectDialog]);

  return {
    showRejectDialog,
    setShowRejectDialog,
    handleApproveClick,
    handleRejectClick,
    handleRejectConfirm
  };
}
