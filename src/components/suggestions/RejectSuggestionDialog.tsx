
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface RejectSuggestionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReject: () => void;
  rejectionReason: string;
  setRejectionReason: (reason: string) => void;
  isProcessing: boolean;
}

export const RejectSuggestionDialog: React.FC<RejectSuggestionDialogProps> = ({
  open,
  onOpenChange,
  onReject,
  rejectionReason,
  setRejectionReason,
  isProcessing
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Suggestion</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="mb-4">Please provide a reason for rejecting this suggestion:</p>
          <Input
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Reason for rejection"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button 
            variant="destructive" 
            onClick={onReject}
            disabled={isProcessing}
          >
            Reject
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
