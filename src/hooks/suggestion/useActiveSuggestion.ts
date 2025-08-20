
import { useState } from 'react';
import { Suggestion } from '@/components/suggestions/types';

export const useActiveSuggestion = () => {
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{x: number, y: number} | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const openSuggestionPopover = (suggestion: Suggestion, position: {x: number, y: number}) => {
    setActiveSuggestion(suggestion);
    setPopoverPosition(position);
    setIsPopoverOpen(true);
  };

  const closeSuggestionPopover = () => {
    setIsPopoverOpen(false);
  };

  const prepareRejectSuggestion = (suggestionId: string) => {
    setSelectedSuggestionId(suggestionId);
    setIsPopoverOpen(false);
    return true;
  };

  const resetRejectDialog = () => {
    setSelectedSuggestionId(null);
    setRejectionReason('');
  };

  return {
    activeSuggestion,
    popoverPosition,
    isPopoverOpen,
    selectedSuggestionId,
    rejectionReason,
    setRejectionReason,
    openSuggestionPopover,
    closeSuggestionPopover,
    prepareRejectSuggestion,
    resetRejectDialog
  };
};
