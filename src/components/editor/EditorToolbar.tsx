
import React from 'react';
import { Button } from '@/components/ui/button';
import { 
  Bold, 
  Italic, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  ArrowLeftRight 
} from 'lucide-react';

interface EditorToolbarProps {
  currentFormat: Record<string, any>;  // e.g. { bold: true, italic: true, align: 'right', ... }
  onFormat: (format: string, value: any) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ currentFormat, onFormat }) => {

  // Toggle bold
  const toggleBold = () => {
    const isCurrentlyBold = !!currentFormat.bold;
    onFormat('bold', !isCurrentlyBold); 
  };

  // Toggle italic
  const toggleItalic = () => {
    const isCurrentlyItalic = !!currentFormat.italic;
    onFormat('italic', !isCurrentlyItalic);
  };

  // Set alignment to left (or remove alignment if Quill uses `false`)
  const alignLeft = () => {
    // If already aligned left (or no explicit align), clear any alignment
    if (!currentFormat.align) return;
    onFormat('align', false);
  };

  const alignCenter = () => {
    if (currentFormat.align === 'center') {
      onFormat('align', false);
    } else {
      onFormat('align', 'center');
    }
  };

  const alignRight = () => {
    if (currentFormat.align === 'right') {
      onFormat('align', false);
    } else {
      onFormat('align', 'right');
    }
  };

  // Toggle RTL direction. If it's already RTL, revert to LTR; otherwise set RTL.
  const toggleRTL = () => {
    const isCurrentlyRTL = currentFormat.direction === 'rtl';
    onFormat('direction', isCurrentlyRTL ? false : 'rtl');
  };

  return (
    <div className="flex space-x-2">
      {/* BOLD */}
      <Button
        variant="outline"
        size="sm"
        className={`${currentFormat.bold ? 'bg-gray-600 text-white' : ''}`}
        onClick={toggleBold}
      >
        <Bold className="w-4 h-4" />
      </Button>

      {/* ITALIC */}
      <Button
        variant="outline"
        size="sm"
        className={`${currentFormat.italic ? 'bg-gray-600 text-white' : ''}`}
        onClick={toggleItalic}
      >
        <Italic className="w-4 h-4" />
      </Button>

      {/* ALIGNMENT */}
      <div className="flex space-x-1 border rounded-md px-1">
        {/* ALIGN LEFT */}
        <Button
          variant="ghost"
          size="sm"
          className={`${!currentFormat.align ? 'bg-gray-600 text-white' : ''}`}
          onClick={alignLeft}
        >
          <AlignLeft className="w-4 h-4" />
        </Button>

        {/* ALIGN CENTER */}
        <Button
          variant="ghost"
          size="sm"
          className={`${currentFormat.align === 'center' ? 'bg-gray-600 text-white' : ''}`}
          onClick={alignCenter}
        >
          <AlignCenter className="w-4 h-4" />
        </Button>

        {/* ALIGN RIGHT */}
        <Button
          variant="ghost"
          size="sm"
          className={`${currentFormat.align === 'right' ? 'bg-gray-600 text-white' : ''}`}
          onClick={alignRight}
        >
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      {/* TOGGLE RTL */}
      <Button
        variant="outline"
        size="sm"
        className={`${currentFormat.direction === 'rtl' ? 'bg-gray-600 text-white' : ''}`}
        onClick={toggleRTL}
      >
        <ArrowLeftRight className="w-4 h-4" />
      </Button>
    </div>
  );
};
