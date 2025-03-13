
import { useState, useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { captureContentFromDOM, extractQuillContent } from '@/utils/saveDraftUtils';
import { supabase } from '@/integrations/supabase/client';
import { saveSuggestions } from '@/utils/suggestions';
import { toast } from 'sonner';
import { DeltaContent } from '@/utils/editor/types';

// Utility function to save lines to database
const saveLinesToDatabase = async (
  scriptId: string,
  lineData: LineData[],
  content: string | DeltaContent
): Promise<boolean> => {
  try {
    // For the simplified Delta approach, we don't need lineData
    // Convert Delta to a format suitable for database storage
    const contentToSave = typeof content === 'string'
      ? { ops: [{ insert: content }] }
      : content;
    
    // Update script_content
    const { error } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: contentToSave,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id'
      });
    
    if (error) {
      console.error('Error saving content:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveLinesToDatabase:', error);
    return false;
  }
};

// Utility function to save draft
const saveDraft = async (
  scriptId: string,
  lineData: LineData[],
  content: any,
  userId: string,
  quill: any = null
): Promise<boolean> => {
  try {
    // Get the most up-to-date content from the editor if available
    const currentContent = quill ? extractQuillContent(quill) : content;
    
    // Ensure we have valid content
    if (!currentContent) {
      console.error('No content to save');
      return false;
    }
    
    // Save to script_drafts table
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: userId,
        draft_content: currentContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id,user_id'
      });
    
    if (error) {
      console.error('Error saving draft:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveDraft:', error);
    return false;
  }
};

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
    return content;
  }, [quill, content]);

  const saveToSupabase = useCallback(async (currentContent?: string | DeltaContent) => {
    if (!scriptId || !userId) {
      toast.error(!scriptId ? 'No script ID provided' : 'You must be logged in to save drafts');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log(`📋 useSubmitEdits: Saving drafts for ${isAdmin ? 'admin' : 'non-admin'} user`, userId);
      
      // Capture the most up-to-date content
      const contentToSave = currentContent || captureCurrentContent() || content;
      
      console.log('📋 useSubmitEdits: Saving content type:', typeof contentToSave);
      
      if (isAdmin) {
        await saveDraft(scriptId, lineData, contentToSave, userId, quill);
      } else {
        await saveDraft(scriptId, lineData, contentToSave, userId, quill);
      }
      
      toast.success('Draft saved successfully!');
      
      // Only reload drafts if we're in admin mode, for non-admin they're already in sync
      if (isAdmin) {
        await loadDrafts();
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
      const contentToSave = currentContent || captureCurrentContent() || content;
      
      if (isAdmin) {
        // Save to database first
        await saveLinesToDatabase(scriptId, lineData, contentToSave);
        
        // Then notify parent component for GitHub commit if needed
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
