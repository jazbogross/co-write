
import React from 'react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface EditorToolbarProps {
  onFormat: (format: string, value: any) => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({ onFormat }) => {
  return (
    <div className="w-48 bg-gray-800 border-r border-gray-700 p-4 space-y-2">
      <h3 className="text-sm font-semibold mb-4 text-white">Formatting</h3>
      <div className="space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => onFormat('bold', true)}
        >
          <Bold className="w-4 h-4 mr-2" />
          Bold
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => onFormat('italic', true)}
        >
          <Italic className="w-4 h-4 mr-2" />
          Italic
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => onFormat('align', false)}
        >
          <AlignLeft className="w-4 h-4 mr-2" />
          Left
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => onFormat('align', 'center')}
        >
          <AlignCenter className="w-4 h-4 mr-2" />
          Center
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start"
          onClick={() => onFormat('align', 'right')}
        >
          <AlignRight className="w-4 h-4 mr-2" />
          Right
        </Button>
      </div>
    </div>
  );
};
