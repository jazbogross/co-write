
import { useState, useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { saveDraft } from '@/utils/saveDraftUtils';
import { saveLinesToDatabase } from '@/utils/saveLineUtils';
import { saveSuggestions, saveLineDrafts } from '@/utils/suggestions';
import { toast } from 'sonner';
import { DeltaContent } from '@/utils/editor/types';

export const useSubmitEdits = (
  isAdmin: boolean,
  scriptId: string,
  originalContent: string, // Kept for backward compatibility but not used
  content: string | DeltaContent,
  lineData: LineData[],
  userId: string | null,
  onSuggestChange: (suggestion: string | DeltaContent) => void, // Updated to accept DeltaContent
  loadDrafts: () => Promise<void>,
  quill: any = null
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Function to save line data (draft)
  const saveToSupabase = useCallback(async () => {
    if (!scriptId) return;

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        await saveDraft(scriptId, lineData, content, userId, quill);
        toast.success('Draft saved successfully!');
      } else {
        // For contributors we save suggestions as drafts
        await saveLineDrafts(scriptId, lineData, "", userId); // Empty originalContent
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
  }, [isAdmin, scriptId, lineData, content, userId, loadDrafts, quill]);

  // Function to submit changes (for approval)
  const handleSubmit = useCallback(async () => {
    if (!scriptId) return;

    setIsSubmitting(true);
    try {
      if (isAdmin) {
        // Admin can directly save changes to the script_content table
        await saveLinesToDatabase(scriptId, lineData, content);
        onSuggestChange(content); // Pass the content directly, which could be string or DeltaContent
        toast.success('Changes saved successfully!');
      } else {
        // Non-admin submits suggestions
        await saveSuggestions(scriptId, lineData, "", userId); // Empty originalContent
        toast.success('Suggestions submitted for approval!');
      }
    } catch (error) {
      console.error('Error submitting changes:', error);
      toast.error(error instanceof Error ? error.message : 'Error submitting changes');
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, scriptId, lineData, content, userId, onSuggestChange]);

  return {
    isSubmitting,
    handleSubmit,
    saveToSupabase
  };
};
