
import { DeltaStatic } from 'quill';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';

/**
 * Captures content directly from the DOM via the Quill editor
 */
export const captureContentFromDOM = (editor: any): DeltaStatic | null => {
  if (!editor) return null;
  
  try {
    // Get the current Delta content from the editor
    return editor.getContents();
  } catch (error) {
    console.error('Error capturing content from DOM:', error);
    return null;
  }
};

/**
 * Safely extracts content from Quill editor
 */
export const extractQuillContent = (quill: any): DeltaStatic | null => {
  if (!quill) return null;
  
  try {
    return quill.getContents();
  } catch (error) {
    console.error('Error extracting Quill content:', error);
    return null;
  }
};

/**
 * Save draft to Supabase
 */
export const saveDraft = async (
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
    
    // Convert to JSON for storage
    const contentJson = JSON.stringify(currentContent);
    
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
