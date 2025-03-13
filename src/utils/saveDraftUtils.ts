
import { supabase } from '@/integrations/supabase/client';
import { LineData, DeltaStatic } from '@/types/lineTypes';
import { toast } from 'sonner';

// Capture content directly from Quill editor DOM
export const captureContentFromDOM = (editor: any) => {
  if (!editor) return null;
  
  try {
    // Get the contents directly from the editor
    const content = editor.getContents();
    
    // If we have content, return it
    if (content) {
      return { 
        content,
        lineData: [] // Line data is not needed in Delta approach
      };
    }
  } catch (error) {
    console.error('Error capturing content from DOM:', error);
  }
  
  return null;
};

// Save draft to Supabase
export const saveDraft = async (
  scriptId: string,
  lineData: LineData[],
  content: string | DeltaStatic,
  userId: string,
  editor?: any
) => {
  try {
    console.log('Saving draft with content type:', typeof content);
    
    // If we have an editor, try to get content directly
    let draftContent = content;
    if (editor) {
      try {
        draftContent = editor.getContents();
      } catch (e) {
        console.warn('Could not get contents from editor:', e);
      }
    }
    
    // Make sure our content is a Delta object
    if (typeof draftContent === 'string') {
      try {
        draftContent = JSON.parse(draftContent);
      } catch (e) {
        console.warn('Could not parse string content as Delta:', e);
        // Create a simple Delta with the string content
        draftContent = {
          ops: [{ insert: draftContent + '\n' }]
        };
      }
    }
    
    // Check if a draft already exists for this user and script
    const { data: existingDraft } = await supabase
      .from('script_drafts')
      .select('id')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .maybeSingle();
    
    if (existingDraft) {
      // Update existing draft
      await supabase
        .from('script_drafts')
        .update({
          draft_content: draftContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingDraft.id);
    } else {
      // Create new draft
      await supabase
        .from('script_drafts')
        .insert({
          script_id: scriptId,
          user_id: userId,
          draft_content: draftContent
        });
    }
    
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    toast.error('Failed to save draft');
    return false;
  }
};
