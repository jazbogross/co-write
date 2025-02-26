import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface EditorToolbarProps {
  onFormat: (format: string, value: any) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onFormat }) => {
  return (
    <>    
      <Button 
        variant="outline" 
        size="sm" 
        className="justify-start"
        onClick={() => onFormat('bold', true)}
      >
        <Bold className="w-4 h-4 mr-2" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="justify-start"
        onClick={() => onFormat('italic', true)}
      >
        <Italic className="w-4 h-4 mr-2" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="justify-start"
        onClick={() => onFormat('align', false)}
      >
        <AlignLeft className="w-4 h-4 mr-2" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="justify-start"
        onClick={() => onFormat('align', 'center')}
      >
        <AlignCenter className="w-4 h-4 mr-2" />
      </Button>
      <Button 
        variant="outline" 
        size="sm" 
        className="justify-start"
        onClick={() => onFormat('align', 'right')}
      >
        <AlignRight className="w-4 h-4 mr-2" />
      </Button>
    </>
  );
};
