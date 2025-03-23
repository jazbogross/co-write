import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

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

  // Toggle alignment to left (or remove alignment if Quill uses `false`)
  const alignLeft = () => {
    onFormat('align', false);
  };

  const alignCenter = () => {
    onFormat('align', 'center');
  };

  const alignRight = () => {
    onFormat('align', 'right');
  };

  // Example: toggling RTL. If it's already RTL, revert to LTR; otherwise set RTL.
  const toggleRTL = () => {
    const isCurrentlyRTL = currentFormat.direction === 'rtl';
    if (isCurrentlyRTL) {
      // if already RTL, switch to LTR
      onFormat('direction', false);
      onFormat('align', false);
    } else {
      // set text to RTL and align right
      onFormat('direction', 'rtl');
      onFormat('align', 'right');
    }
  };

  return (
    <>
      {/* BOLD */}
      <Button
        variant="outline"
        size="sm"
        className={`justify-start ${currentFormat.bold ? 'bg-gray-600 text-white' : ''}`}
        onClick={toggleBold}
      >
        <Bold className="w-4 h-4 mr-2" />
      </Button>

      {/* ITALIC */}
      <Button
        variant="outline"
        size="sm"
        className={`justify-start ${currentFormat.italic ? 'bg-gray-600 text-white' : ''}`}
        onClick={toggleItalic}
      >
        <Italic className="w-4 h-4 mr-2" />
      </Button>

      {/* ALIGN LEFT */}
      <Button
        variant="outline"
        size="sm"
        className={`justify-start ${currentFormat.align === undefined ? 'bg-gray-600 text-white' : ''}`}
        onClick={alignLeft}
      >
        <AlignLeft className="w-4 h-4 mr-2" />
      </Button>

      {/* ALIGN CENTER */}
      <Button
        variant="outline"
        size="sm"
        className={`justify-start ${currentFormat.align === 'center' ? 'bg-gray-600 text-white' : ''}`}
        onClick={alignCenter}
      >
        <AlignCenter className="w-4 h-4 mr-2" />
      </Button>

      {/* ALIGN RIGHT */}
      <Button
        variant="outline"
        size="sm"
        className={`justify-start ${currentFormat.align === 'right' ? 'bg-gray-600 text-white' : ''}`}
        onClick={alignRight}
      >
        <AlignRight className="w-4 h-4 mr-2" />
      </Button>

      {/* TOGGLE RTL */}
      <Button
        variant="outline"
        size="sm"
        className={`justify-start ${currentFormat.direction === 'rtl' ? 'bg-gray-600 text-white' : ''}`}
        onClick={toggleRTL}
      >
        RTL
      </Button>
    </>
  );
};
