import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeContentForStorage } from '@/utils/deltaUtils';
import { saveSuggestions } from '@/utils/suggestions/saveSuggestions';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { saveNamedVersion } from '@/utils/saveLineUtils';
import { DeltaStatic } from '@/utils/editor/quill-types';

// Update function to use scripts table
const saveScriptContent = async (
  scriptId: string,
  content: DeltaContent | DeltaStatic | string,
  userId: string | null
): Promise<boolean> => {
  try {
    // Validate inputs
    if (!scriptId) {
      console.error('Missing scriptId in saveScriptContent');
      return false;
    }
    
    // Normalize content for storage
    const normalizedContent = normalizeContentForStorage(content);
    
    // Update scripts table directly
    const { error } = await supabase
      .from('scripts')
      .update({
        content: normalizedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId);
    
    if (error) {
      console.error('Error saving script content:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveScriptContent:', error);
    return false;
  }
};

interface UseSubmitEditsParams {
  scriptId: string;
  isAdmin: boolean;
  userId: string | null;
}

interface SubmitOptions {
  showToast?: boolean;
  asDraft?: boolean;
}

export const useSubmitEdits = ({ 
  scriptId, 
  isAdmin, 
  userId 
}: UseSubmitEditsParams) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  
  const submitAsAdmin = useCallback(async (
    content: DeltaContent | DeltaStatic | string,
    options: SubmitOptions = { showToast: true }
  ): Promise<boolean> => {
    try {
      setIsSaving(true);
      
      const success = await saveScriptContent(scriptId, content, userId);
      
      if (success) {
        setLastSavedTime(new Date());
        if (options.showToast) {
          toast.success('Script content updated successfully');
        }
      } else if (options.showToast) {
        toast.error('Failed to save script content');
      }
      
      return success;
    } catch (error) {
      console.error('Error in submitAsAdmin:', error);
      if (options.showToast) {
        toast.error('An error occurred while saving');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [scriptId, userId]);
  
  const submitAsDraft = useCallback(async (
    content: DeltaContent | DeltaStatic,
    options: SubmitOptions = { showToast: true }
  ): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      setIsSaving(true);
      
      // Normalize content for Supabase's JSON compatibility
      const normalizedContent = normalizeContentForStorage(content);
      
      // Save to script_drafts table
      const { error } = await supabase
        .from('script_drafts')
        .upsert({
          script_id: scriptId,
          user_id: userId,
          draft_content: normalizedContent,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'script_id,user_id'
        });
      
      if (error) {
        console.error('Error saving draft:', error);
        if (options.showToast) {
          toast.error('Failed to save draft');
        }
        return false;
      }
      
      setLastSavedTime(new Date());
      
      if (options.showToast) {
        toast.success('Draft saved successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error in submitAsDraft:', error);
      if (options.showToast) {
        toast.error('An error occurred while saving draft');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [scriptId, userId]);
  
  const submitAsSuggestion = useCallback(async (
    lineData: LineData[],
    originalContent: any,
    options: SubmitOptions = { showToast: true }
  ): Promise<{ success: boolean; id?: string }> => {
    if (!userId) return { success: false };
    
    try {
      setIsSaving(true);
      
      // Convert lineData to string if needed
      const result = await saveSuggestions(scriptId, userId, lineData, originalContent);
      
      if (result.success) {
        setLastSavedTime(new Date());
        
        // Clear draft
        await supabase
          .from('script_drafts')
          .delete()
          .eq('script_id', scriptId)
          .eq('user_id', userId);
        
        if (options.showToast) {
          toast.success('Suggestion submitted successfully');
        }
      } else if (options.showToast) {
        toast.error('Failed to submit suggestion');
      }
      
      return result;
    } catch (error) {
      console.error('Error in submitAsSuggestion:', error);
      if (options.showToast) {
        toast.error('An error occurred while submitting suggestion');
      }
      return { success: false };
    } finally {
      setIsSaving(false);
    }
  }, [scriptId, userId]);
  
  const saveVersion = useCallback(async (
    content: DeltaContent | DeltaStatic,
    versionName: string,
    options: SubmitOptions = { showToast: true }
  ): Promise<boolean> => {
    if (!userId || !isAdmin) return false;
    
    try {
      setIsSaving(true);
      
      const success = await saveNamedVersion(scriptId, content, versionName, userId);
      
      if (success) {
        setLastSavedTime(new Date());
        if (options.showToast) {
          toast.success('Version saved successfully');
        }
      } else if (options.showToast) {
        toast.error('Failed to save version');
      }
      
      return success;
    } catch (error) {
      console.error('Error in saveVersion:', error);
      if (options.showToast) {
        toast.error('An error occurred while saving version');
      }
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [scriptId, userId, isAdmin]);
  
  const submitEdits = useCallback(async (
    content: DeltaContent | DeltaStatic,
    options: SubmitOptions = { showToast: true, asDraft: false }
  ): Promise<boolean> => {
    if (isAdmin) {
      return submitAsAdmin(content, options);
    } else if (options.asDraft) {
      return submitAsDraft(content, options);
    }
    
    return false;
  }, [isAdmin, submitAsAdmin, submitAsDraft]);
  
  return {
    submitEdits,
    submitAsAdmin,
    submitAsDraft,
    submitAsSuggestion,
    saveVersion,
    isSaving,
    lastSavedTime
  };
};
