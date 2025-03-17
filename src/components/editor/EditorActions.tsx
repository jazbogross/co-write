
import React from 'react';
import { Button } from '@/components/ui/button';

interface EditorActionsProps {
  isAdmin: boolean;
  isSaving: boolean;
  hasDraft: boolean;
  handleSave: () => Promise<void>;
  handleSubmitSuggestion: () => Promise<void>;
}

export const EditorActions: React.FC<EditorActionsProps> = ({ 
  isAdmin, 
  isSaving, 
  hasDraft, 
  handleSave, 
  handleSubmitSuggestion 
}) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-end space-x-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isAdmin ? 'Save Changes' : 'Save Draft'}
        </Button>
        
        {!isAdmin && (
          <Button
            variant="secondary"
            onClick={handleSubmitSuggestion}
            disabled={isSaving}
          >
            Submit Suggestion
          </Button>
        )}
      </div>
      
      {hasDraft && !isAdmin && (
        <div className="p-2 bg-yellow-50 text-yellow-600 rounded border border-yellow-200 text-sm">
          You have a draft saved. Submit your suggestion when you're ready to propose these changes to the admin.
        </div>
      )}
    </div>
  );
};
