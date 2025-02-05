import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rejectionReason: string;
  onReasonChange: (reason: string) => void;
  onConfirm: () => void;
}

export const RejectionDialog = ({
  open,
  onOpenChange,
  rejectionReason,
  onReasonChange,
  onConfirm,
}: RejectionDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Suggestion</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            placeholder="Please provide a reason for rejection..."
            value={rejectionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            className="min-h-[100px]"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={!rejectionReason.trim()}>
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};