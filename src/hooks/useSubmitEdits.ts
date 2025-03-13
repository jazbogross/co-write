
import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { normalizeContentForStorage } from '@/utils/suggestions/contentUtils';
import { saveSuggestions } from '@/utils/suggestions/saveSuggestions';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';

// Update function to handle line data string
const saveScriptContent = async (
  scriptId: string,
  content: DeltaContent | string,
  userId: string | null
): Promise<boolean> => {
  try {
    // Validate inputs
    if (!scriptId) {
      console.error('Missing scriptId in saveScriptContent');
      return false;
    }
    
    // Normalize content for storage
    const normalizedContent = typeof content === 'string' 
      ? content 
      : normalizeContentForStorage(content);
    
    // Update script_content table
    const { error } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: normalizedContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id'
      });
    
    if (error) {
      console.error('Error saving script content:', error);
      return false;
    }
    
    // Get current version and increment
    const { data: currentData } = await supabase
      .from('script_content')
      .select('version')
      .eq('script_id', scriptId)
      .single();
    
    const currentVersion = currentData?.version || 0;
    const newVersion = currentVersion + 1;
    
    // Update version number
    const { error: versionError } = await supabase
      .from('script_content')
      .update({ version: newVersion })
      .eq('script_id', scriptId);
    
    if (versionError) {
      console.error('Error updating version:', versionError);
    }
    
    // Create version history entry
    const { error: historyError } = await supabase
      .from('script_versions')
      .insert({
        script_id: scriptId,
        version_number: newVersion,
        content_delta: normalizedContent,
        created_by: userId
      });
    
    if (historyError) {
      console.error('Error creating version history:', historyError);
      // Don't fail the overall save operation if version history fails
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
    content: DeltaContent | string,
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
    content: DeltaContent,
    options: SubmitOptions = { showToast: true }
  ): Promise<boolean> => {
    if (!userId) return false;
    
    try {
      setIsSaving(true);
      
      // Normalize content
      const normalizedContent = normalizeContentForStorage(content);
      
      // Save to script_drafts table
      const { error } = await supabase
        .from('script_drafts')
        .upsert({
          script_id: scriptId,
          user_id: userId,
          draft_content: content,
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
  
  const submitEdits = useCallback(async (
    content: DeltaContent,
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
    isSaving,
    lastSavedTime
  };
};
