
import React from 'react';
import { Button } from '@/components/ui/button';
import { EditorToolbar } from './EditorToolbar';
import { Save } from 'lucide-react';

interface TextEditorToolbarProps {
  isAdmin: boolean;
  isSubmitting: boolean;
  onFormat: (format: string, value: any) => void;
  onSubmit: () => void;
  onSave: () => void;
}

export const TextEditorToolbar: React.FC<TextEditorToolbarProps> = ({
  isAdmin,
  isSubmitting,
  onFormat,
  onSubmit,
  onSave,
}) => {
  return (
    <div className='flex justify-between ml-16 mb-2'>
      <div className='flex space-x-2'>
        <EditorToolbar onFormat={onFormat} />
      </div>
      <div className='flex space-x-2'>
        <Button
          variant="outline"
          size="sm"
          className="justify-end"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            isAdmin ? "Committing..." : "Submitting..."
          ) : (
            isAdmin ? "Save Changes" : "Suggest Changes"
          )}
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="justify-end flex items-center"
          onClick={onSave}
          disabled={isSubmitting}
        >
          <Save className="mr-1 h-4 w-4" />
          {isSubmitting ? "Saving..." : "Save Draft"}
        </Button>
      </div>
    </div>
  );
};
