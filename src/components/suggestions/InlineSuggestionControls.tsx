import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';

interface InlineSuggestionControlsProps {
  position: { x: number; y: number } | null;
  suggestionId: string | null;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  visible: boolean;
}

export const InlineSuggestionControls: React.FC<InlineSuggestionControlsProps> = ({
  position,
  suggestionId,
  onApprove,
  onReject,
  visible
}) => {
  if (!visible || !position || !suggestionId) return null;

  const style: React.CSSProperties = {
    position: 'absolute',
    left: position.x,
    top: position.y,
    zIndex: 10000
  };

  const handleMouseDown: React.MouseEventHandler = (e) => {
    e.stopPropagation();
    const ne = (e as any).nativeEvent;
    if (ne && typeof ne.stopImmediatePropagation === 'function') ne.stopImmediatePropagation();
  };

  return (
    <div style={style} onMouseDown={handleMouseDown} onClick={handleMouseDown}>
      <div className="flex gap-1 bg-popover border rounded px-1 py-0.5 shadow">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-green-600 hover:bg-green-50"
          onClick={() => onApprove(suggestionId)}
        >
          <Check className="w-3 h-3" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1 text-red-600 hover:bg-red-50"
          onClick={() => onReject(suggestionId)}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
};

