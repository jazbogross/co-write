
import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { rejectSuggestion } from '@/services/suggestionService';
import { toast } from 'sonner';

interface RejectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestionId: string;
  onSuccess: () => void;
}

export const RejectionDialog: React.FC<RejectionDialogProps> = ({
  open,
  onOpenChange,
  suggestionId,
  onSuccess
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  const handleRejectSuggestion = async () => {
    if (!suggestionId) return;
    
    setIsRejecting(true);
    
    try {
      await rejectSuggestion(suggestionId, rejectionReason);
      toast.success('Suggestion rejected');
      onSuccess();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error('Failed to reject suggestion');
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Suggestion</DialogTitle>
        </DialogHeader>
        <div className="py-2">
          <label className="text-sm font-medium">Reason for rejection (optional):</label>
          <textarea
            className="w-full p-2 border rounded-md mt-1"
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            Cancel
          </Button>
          <Button 
            onClick={handleRejectSuggestion}
            disabled={isRejecting}
            variant="destructive"
          >
            {isRejecting ? 'Rejecting...' : 'Reject Suggestion'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
