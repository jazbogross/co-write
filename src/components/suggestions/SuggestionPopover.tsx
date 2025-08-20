
import React from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { Suggestion } from '@/components/suggestions/types';

interface SuggestionPopoverProps {
  suggestion: Suggestion | null;
  position: { x: number, y: number } | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onClose: () => void;
  open: boolean;
  loading: boolean;
}

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
  suggestion,
  position,
  onApprove,
  onReject,
  onClose,
  open,
  loading
}) => {
  if (!open || !suggestion || !position) return null;
  
  const formattedDate = suggestion.createdAt 
    ? format(new Date(suggestion.createdAt), 'MMM d, yyyy h:mm a')
    : 'Unknown date';

  // Render as a fixed-position card at the top-right, above everything
  const popoverStyle = {
    position: 'fixed',
    right: '16px',
    top: '16px',
    zIndex: 10000
  } as React.CSSProperties;

  return (
    <div
      style={popoverStyle}
      onMouseDown={(e) => {
        e.stopPropagation();
        // Prevent Quill from changing selection on mousedown within the popover
        if ((e as any).nativeEvent && typeof (e as any).nativeEvent.stopImmediatePropagation === 'function') {
          (e as any).nativeEvent.stopImmediatePropagation();
        }
      }}
      onClick={(e) => {
        e.stopPropagation();
        if ((e as any).nativeEvent && typeof (e as any).nativeEvent.stopImmediatePropagation === 'function') {
          (e as any).nativeEvent.stopImmediatePropagation();
        }
      }}
    >
      <div className="w-80 rounded-md border bg-popover p-4 shadow-md">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">Suggestion by {suggestion.username}</h4>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
              onClick={() => onApprove(suggestion.id)}
              disabled={loading}
            >
              <Check className="h-4 w-4" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
              onClick={() => onReject(suggestion.id)}
              disabled={loading}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
