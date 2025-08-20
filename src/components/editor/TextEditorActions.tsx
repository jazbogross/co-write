
import React from 'react';
import { Button } from '@/components/ui/button';
import { Save, History, MessageSquare } from 'lucide-react';
import { EditorToolbar } from './EditorToolbar';

interface TextEditorActionsProps {
  isAdmin: boolean;
  isSubmitting: boolean;
  hasPendingSuggestions?: boolean;
  currentFormat: Record<string, any>;
  onFormat: (format: string, value: any) => void;
  onSubmit: () => void;
  onSave?: () => void;
  onSaveVersion?: () => void;
  onSubmitSuggestion?: () => void;
  onToggleSuggestions?: () => void;
  pendingSuggestionsCount?: number;
}

export const TextEditorActions: React.FC<TextEditorActionsProps> = ({
  isAdmin,
  isSubmitting,
  hasPendingSuggestions = false,
  currentFormat,
  onFormat,
  onSubmit,
  onSave,
  onSaveVersion,
  onSubmitSuggestion,
  onToggleSuggestions,
  pendingSuggestionsCount = 0,
}) => {
  return (
    <div className="flex justify-between sticky top-0 z-10 bg-black pb-2 pt-2">
      {/* Left side: formatting buttons (custom Quill toolbar) */}
      <div className="flex space-x-2">
        <EditorToolbar currentFormat={currentFormat} onFormat={onFormat} />
      </div>

      {/* Right side: Save/Submit/Version actions */}
      <div className="flex space-x-2">
        {isAdmin && onToggleSuggestions && (
          <Button
            variant="outline"
            size="sm"
            className="justify-end flex items-center"
            onClick={onToggleSuggestions}
          >
            <MessageSquare className="mr-1 h-4 w-4" />
            Suggestions {pendingSuggestionsCount > 0 && `(${pendingSuggestionsCount})`}
          </Button>
        )}

        {isAdmin ? (
          <Button
            variant="outline"
            size="sm"
            className="justify-end"
            onClick={onSubmit}
            disabled={isSubmitting || hasPendingSuggestions}
            title={hasPendingSuggestions ? "Review all pending suggestions before saving changes" : ""}
          >
            {isSubmitting ? "Committing..." : "Save Changes"}
          </Button>
        ) : (
          <>
            <Button
              variant="outline"
              size="sm"
              className="justify-end"
              onClick={onSubmitSuggestion}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Suggest Changes"}
            </Button>
            
            {onSave && (
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
            )}
          </>
        )}

        {isAdmin && onSaveVersion && (
          <Button
            variant="outline"
            size="sm"
            className="justify-end flex items-center"
            onClick={onSaveVersion}
            disabled={isSubmitting || hasPendingSuggestions}
            title={hasPendingSuggestions ? "Review all pending suggestions before saving a version" : ""}
          >
            <History className="mr-1 h-4 w-4" />
            Save Version
          </Button>
        )}
      </div>
    </div>
  );
};
