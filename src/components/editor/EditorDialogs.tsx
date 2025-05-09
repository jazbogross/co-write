
import React from 'react';
import { RejectSuggestionDialog } from '@/components/suggestions/RejectSuggestionDialog';
import { SuggestionPopover } from '@/components/suggestions/SuggestionPopover';
import { Suggestion } from '@/components/suggestions/types';

interface EditorDialogsProps {
  isAdmin: boolean;
  activeSuggestion: Suggestion | null;
  popoverPosition: { x: number, y: number } | null;
  isPopoverOpen: boolean;
  showRejectDialog: boolean;
  setShowRejectDialog: (show: boolean) => void;
  selectedSuggestionId: string | null;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  isProcessing: boolean;
  onApprove: (suggestionId: string) => Promise<void>;
  onReject: (suggestionId: string) => void;
  onPopoverClose: () => void;
  onRejectConfirm: () => Promise<void>;
}

export const EditorDialogs: React.FC<EditorDialogsProps> = ({
  isAdmin,
  activeSuggestion,
  popoverPosition,
  isPopoverOpen,
  showRejectDialog,
  setShowRejectDialog,
  selectedSuggestionId,
  rejectionReason,
  setRejectionReason,
  isProcessing,
  onApprove,
  onReject,
  onPopoverClose,
  onRejectConfirm
}) => {
  if (!isAdmin) return null;
  
  return (
    <>
      <SuggestionPopover
        suggestion={activeSuggestion}
        position={popoverPosition}
        onApprove={onApprove}
        onReject={onReject}
        onClose={onPopoverClose}
        open={isPopoverOpen}
        loading={isProcessing}
      />
      
      <RejectSuggestionDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onReject={onRejectConfirm}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        isProcessing={isProcessing}
      />
    </>
  );
};
