
import React from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import {
  BoldIcon,
  ItalicIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  SaveIcon,
  SendIcon,
  FolderOpenIcon,
} from 'lucide-react';

interface EditorActionsProps {
  isAdmin: boolean;
  isSubmitting: boolean;
  onFormat: (format: string, value: any) => void;
  onSubmit: () => void;
  onSave: () => void;
  onLoadDrafts?: () => void;
  hasUnsavedDrafts?: boolean;
}

export const EditorActions: React.FC<EditorActionsProps> = ({
  isAdmin,
  isSubmitting,
  onFormat,
  onSubmit,
  onSave,
  onLoadDrafts,
  hasUnsavedDrafts = false,
}) => {
  const { toast } = useToast();

  return (
    <div className="bg-white border-b flex flex-wrap items-center justify-between p-2 gap-2 sticky top-0 z-10">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          title="Bold"
          className="h-8 w-8"
          onClick={() => onFormat('bold', true)}
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Italic"
          className="h-8 w-8"
          onClick={() => onFormat('italic', true)}
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Align Left"
          className="h-8 w-8"
          onClick={() => onFormat('align', '')}
        >
          <AlignLeftIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          title="Align Center"
          className="h-8 w-8"
          onClick={() => onFormat('align', 'center')}
        >
          <AlignCenterIcon className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex items-center gap-2">
        {onLoadDrafts && (
          <Button
            variant="outline"
            size="sm"
            title="Load Saved Drafts"
            className="flex items-center gap-1"
            onClick={onLoadDrafts}
            disabled={isSubmitting}
          >
            <FolderOpenIcon className="h-4 w-4" />
            <span>Load Drafts</span>
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          title="Save Draft"
          className="flex items-center gap-1"
          onClick={onSave}
          disabled={isSubmitting}
        >
          <SaveIcon className="h-4 w-4" />
          <span>Save Draft</span>
        </Button>
        <Button
          size="sm"
          title={isAdmin ? "Publish Changes" : "Submit Suggestion"}
          className="flex items-center gap-1"
          onClick={onSubmit}
          disabled={isSubmitting}
        >
          <SendIcon className="h-4 w-4" />
          <span>{isAdmin ? "Publish" : "Submit"}</span>
        </Button>
      </div>
    </div>
  );
};
