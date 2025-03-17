
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
    <div className="space-y-4 sticky top-0 z-20 h-10 flex justify-end">
      <div className="flex justify-end space-x-2 w-1/2 bg-black">
        <Button
          className='w-auto h-auto bg-black text-white border-white border mb-1 mt-1'
          variant="secondary"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isAdmin ? 'Save Changes' : 'Save Draft'}
        </Button>
        
        {!isAdmin && (
          <Button
            className='w-auto h-auto bg-black text-white border-white border mb-1 mt-1'
            variant="secondary"
            onClick={handleSubmitSuggestion}
            disabled={isSaving}
          >
            Submit Suggestion
          </Button>
        )}
      </div>
      
      {hasDraft && !isAdmin && (
        <div className="p-2 bg-yellow-50 text-yellow-600 border border-yellow-200 text-sm">
          You have a draft saved. Submit your suggestion when you're ready to propose these changes to the admin.
        </div>
      )}
    </div>
  );
};
