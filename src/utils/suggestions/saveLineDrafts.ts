
import { supabase } from '@/integrations/supabase/client';
import { DeltaContent } from '@/utils/editor/types';
import { LineData } from '@/types/lineTypes';
import { combineDeltaContents } from '@/utils/editor/operations/deltaCombination';

/**
 * Save line drafts to the database
 */
export const saveLineDrafts = async (
  scriptId: string,
  userId: string | null,
  lineData: LineData[]
): Promise<{ success: boolean; error?: any }> => {
  if (!userId) {
    console.error('Cannot save drafts without user ID');
    return { success: false, error: 'No user ID provided' };
  }
  
  if (!lineData || lineData.length === 0) {
    console.error('No line data to save');
    return { success: false, error: 'No line data to save' };
  }
  
  try {
    // In the simplified Delta approach, just save the complete Delta content
    
    // Extract the Delta content (should be in the first and only line)
    const deltaContent = lineData[0].content;
    
    // Check if we have valid Delta content
    if (!deltaContent || !('ops' in deltaContent)) {
      console.error('Invalid Delta content');
      return { success: false, error: 'Invalid Delta content' };
    }
    
    // Save draft to script_drafts table
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: userId,
        draft_content: deltaContent as any,
        updated_at: new Date().toISOString()
      }, { onConflict: 'script_id, user_id' });
    
    if (error) {
      console.error('Error saving drafts:', error);
      return { success: false, error };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error in saveLineDrafts:', error);
    return { success: false, error };
  }
};
