
import { useState, useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { saveDraft } from '@/utils/saveDraftUtils';
import { saveLinesToDatabase } from '@/utils/saveLineUtils';
import { saveSuggestions, saveLineDrafts } from '@/utils/suggestions';
import { toast } from 'sonner';
import { DeltaContent, isDeltaObject } from '@/utils/editor';

export const useSubmitEdits = (
  isAdmin: boolean,
  scriptId: string,
  originalContent: string, // Kept for backward compatibility but not used
  content: string | DeltaContent,
  lineData: LineData[],
  userId: string | null,
  onSuggestChange: (suggestion: string | DeltaContent) => void, 
  loadDrafts: () => Promise<void>,
  quill: any = null
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Helper to ensure we have the most current content
  const getContentToSave = useCallback((currentContent?: string | DeltaContent) => {
    console.log('getContentToSave: Original content:', currentContent || content);
    
    // Use provided content if available, otherwise use state content
    const contentToUse = currentContent || content;
    
    // If it's a Delta object, ensure it's properly stringified for storage
    if (isDeltaObject(contentToUse)) {
      console.log('getContentToSave: Detected Delta object, stringifying once');
      return contentToUse;
    }
    
    return contentToUse;
  }, [content]);

  // Function to save line data (draft)
  const saveToSupabase = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId) {
      toast.error('No script ID provided');
      return;
    }

    if (!userId) {
      toast.error('You must be logged in to save drafts');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`Saving drafts for ${isAdmin ? 'admin' : 'non-admin'} user`, userId);
      
      // Get the full content to save - this ensures all lines are included
      const contentToSave = getContentToSave(currentContent);
      console.log('saveToSupabase: Content to save:', JSON.stringify(contentToSave).substring(0, 100) + '...');
      
      if (isAdmin) {
        // For admins: Use saveDraft to save to script_content table
        await saveDraft(scriptId, lineData, contentToSave, userId, quill);
        toast.success('Draft saved successfully!');
      } else {
        // For non-admins: Use saveLineDrafts to save to script_suggestions table
        await saveLineDrafts(scriptId, lineData, "", userId);
        toast.success('Suggestion saved as draft!');
      }

      // Reload the drafts to ensure we have the latest data
      await loadDrafts();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Error saving draft');
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, scriptId, lineData, content, userId, loadDrafts, quill, getContentToSave]);

  // Function to submit changes (for approval)
  const handleSubmit = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId) {
      toast.error('No script ID provided');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`Submitting changes for ${isAdmin ? 'admin' : 'non-admin'} user`);
      
      // Get the full content to save - this ensures all lines are included
      const contentToSave = getContentToSave(currentContent);
      
      if (isAdmin) {
        // Admin can directly save changes to the script_content table
        await saveLinesToDatabase(scriptId, lineData, contentToSave);
        onSuggestChange(contentToSave); // Pass the content directly
        toast.success('Changes saved successfully!');
      } else {
        // Non-admin submits suggestions
        if (!userId) {
          throw new Error('User ID is required to submit suggestions');
        }
        await saveSuggestions(scriptId, lineData, "", userId);
        toast.success('Suggestions submitted for approval!');
      }
    } catch (error) {
      console.error('Error submitting changes:', error);
      toast.error('Error submitting changes');
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, scriptId, lineData, userId, onSuggestChange, getContentToSave]);

  return {
    isSubmitting,
    handleSubmit,
    saveToSupabase
  };
};
