
import { useState, useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { saveDraft, captureContentFromDOM } from '@/utils/saveDraftUtils';
import { saveLinesToDatabase } from '@/utils/saveLineUtils';
import { saveSuggestions, saveLineDrafts } from '@/utils/suggestions';
import { toast } from 'sonner';
import { DeltaContent } from '@/utils/editor/types';

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

  // Helper to capture the most up-to-date content from the DOM
  const captureCurrentContent = useCallback(() => {
    // Use DOM-based capture if we have an editor instance
    if (quill) {
      console.log('📋 useSubmitEdits: Capturing content directly from DOM');
      return captureContentFromDOM(quill);
    }
    
    // Fallback to using the provided content and lineData
    console.log('📋 useSubmitEdits: Using provided content for save');
    return { 
      content, 
      lineData 
    };
  }, [quill, content, lineData]);

  const saveToSupabase = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId || !userId) {
      toast.error(!scriptId ? 'No script ID provided' : 'You must be logged in to save drafts');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`📋 useSubmitEdits: Saving drafts for ${isAdmin ? 'admin' : 'non-admin'} user`, userId);
      
      // Capture the most up-to-date content
      const captured = captureCurrentContent();
      const contentToSave = currentContent || captured?.content || content;
      const lineDataToSave = captured?.lineData || lineData;
      
      console.log('📋 useSubmitEdits: Saving content type:', typeof contentToSave);
      console.log('📋 useSubmitEdits: Number of line data items:', lineDataToSave.length);
      
      // Only save drafts for non-admin users
      if (!isAdmin) {
        await saveLineDrafts(scriptId, lineDataToSave, "", userId);
        toast.success('Draft saved successfully!');
      }
    } catch (error) {
      console.error('📋 useSubmitEdits: Error saving draft:', error);
      toast.error('Error saving draft');
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, scriptId, userId, loadDrafts, quill, content, lineData, captureCurrentContent]);

  const handleSubmit = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId) {
      toast.error('No script ID provided');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`📋 useSubmitEdits: Submitting changes for ${isAdmin ? 'admin' : 'non-admin'} user`);
      
      // Capture the most up-to-date content
      const captured = captureCurrentContent();
      const contentToSave = currentContent || captured?.content || content;
      const lineDataToSave = captured?.lineData || lineData;
      
      if (isAdmin) {
        await saveLinesToDatabase(scriptId, lineDataToSave, contentToSave);
        onSuggestChange(contentToSave);
        toast.success('Changes saved successfully!');
      } else {
        if (!userId) {
          throw new Error('User ID is required to submit suggestions');
        }
        await saveSuggestions(scriptId, lineDataToSave, "", userId);
        toast.success('Suggestions submitted for approval!');
      }
    } catch (error) {
      console.error('📋 useSubmitEdits: Error submitting changes:', error);
      toast.error('Error submitting changes');
    } finally {
      setIsSubmitting(false);
    }
  }, [isAdmin, scriptId, lineData, userId, onSuggestChange, content, captureCurrentContent]);

  return {
    isSubmitting,
    handleSubmit,
    saveToSupabase,
    captureCurrentContent
  };
};
