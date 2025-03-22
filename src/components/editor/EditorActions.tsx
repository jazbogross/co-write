
import React from 'react';
import { Button } from '@/components/ui/button';

interface EditorActionsProps {
  isAdmin: boolean;
  isSaving: boolean;
  hasDraft: boolean;
  handleSave: () => Promise<void>;
  handleSubmitSuggestion: () => Promise<void>;
  onSaveVersion?: () => void;
}

export const EditorActions: React.FC<EditorActionsProps> = ({ 
  isAdmin, 
  isSaving, 
  hasDraft, 
  handleSave, 
  handleSubmitSuggestion,
  onSaveVersion
}) => {
  return (
    <div className="sticky top-0 z-20 flex justify-end items-center h-12 bg-black">
      <div className="flex justify-end space-x-2">
        <Button
          className='h-8 bg-black text-white border-white border'
          variant="secondary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isAdmin ? 'Save Changes' : 'Save Draft'}
        </Button>
        
        {isAdmin && onSaveVersion && (
          <Button
            className='h-8 bg-black text-white border-white border'
            variant="secondary"
            onClick={onSaveVersion}
            disabled={isSaving}
          >
            Save Version
          </Button>
        )}
        
        {!isAdmin && (
          <Button
            className='h-8 bg-black text-white border-white border'
            variant="secondary"
            onClick={handleSubmitSuggestion}
            disabled={isSaving}
          >
            Submit Suggestion
          </Button>
        )}
      </div>
      
      {hasDraft && !isAdmin && (
        <div className="absolute top-12 right-0 p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 text-sm">
          You have a draft saved. Submit your suggestion when you're ready to propose these changes to the admin.
        </div>
      )}
    </div>
  );
};
