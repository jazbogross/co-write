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
  originalContent: string,
  content: string | DeltaContent,
  lineData: LineData[],
  userId: string | null,
  onSuggestChange: (suggestion: string | DeltaContent) => void,
  loadDrafts: () => Promise<void>,
  quill: any = null
) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getContentToSave = useCallback((currentContent?: string | DeltaContent) => {
    console.log('getContentToSave: Original content:', currentContent || content);
    
    const contentToUse = currentContent || content;
    
    if (isDeltaObject(contentToUse)) {
      console.log('getContentToSave: Detected Delta object');
      return contentToUse;
    }
    
    return contentToUse;
  }, [content]);

  const saveToSupabase = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId || !userId) {
      toast.error(!scriptId ? 'No script ID provided' : 'You must be logged in to save drafts');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`Saving drafts for ${isAdmin ? 'admin' : 'non-admin'} user`, userId);
      
      const contentToSave = getContentToSave(currentContent);
      console.log('saveToSupabase: Content to save:', JSON.stringify(contentToSave).substring(0, 100) + '...');
      
      if (isAdmin) {
        await saveDraft(scriptId, lineData, contentToSave, userId, quill);
      } else {
        await saveLineDrafts(scriptId, lineData, "", userId);
      }
      
      toast.success('Draft saved successfully!');
      await loadDrafts();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Error saving draft');
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, scriptId, lineData, content, userId, loadDrafts, quill, getContentToSave]);

  const handleSubmit = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId) {
      toast.error('No script ID provided');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`Submitting changes for ${isAdmin ? 'admin' : 'non-admin'} user`);
      
      const contentToSave = getContentToSave(currentContent);
      
      if (isAdmin) {
        await saveLinesToDatabase(scriptId, lineData, contentToSave);
        onSuggestChange(contentToSave);
        toast.success('Changes saved successfully!');
      } else {
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
