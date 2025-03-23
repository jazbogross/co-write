import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, History } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';

interface TextEditorActionsProps {
  isAdmin: boolean;
  isSubmitting: boolean;
  currentFormat: Record<string, any>;         // added to track current selection format
  onFormat: (format: string, value: any) => void;
  onSubmit: () => void;
  onSave: () => void;
  onSaveVersion: () => void;
}

export const TextEditorActions: React.FC<TextEditorActionsProps> = ({
  isAdmin,
  isSubmitting,
  currentFormat,
  onFormat,
  onSubmit,
  onSave,
  onSaveVersion,
}) => {
  return (
    <div className="flex justify-between sticky top-0 z-10 bg-black pb-2 pt-2">
      {/* Left side: formatting buttons (custom Quill toolbar) */}
      <div className="flex space-x-2">
        <EditorToolbar currentFormat={currentFormat} onFormat={onFormat} />
      </div>

      {/* Right side: Save/Submit/Version actions */}
      <div className="flex space-x-2">
        <Button
          variant="outline"
          size="sm"
          className="justify-end"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting
            ? (isAdmin ? "Committing..." : "Submitting...")
            : (isAdmin ? "Save Changes" : "Suggest Changes")
          }
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

        {isAdmin && (
          <Button
            variant="outline"
            size="sm"
            className="justify-end flex items-center"
            onClick={onSaveVersion}
            disabled={isSubmitting}
          >
            <History className="mr-1 h-4 w-4" />
            Save Version
          </Button>
        )}
      </div>
    </div>
  );
};
