
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

/**
 * Save user drafts to the database
 */
export const saveLineDrafts = async (
  scriptId: string,
  lineData: LineData[],
  userId: string
): Promise<boolean> => {
  try {
    console.log('💾 Saving drafts for user:', userId);
    
    // For the simplified Delta approach, we take content from lineData
    if (!lineData || lineData.length === 0) {
      console.error('No line data provided');
      return false;
    }
    
    // Get content from first line
    const content = lineData[0].content;
    
    // Ensure content is in Delta format
    const draftContent = isDeltaObject(content) 
      ? content 
      : { ops: [{ insert: String(content) }] };
    
    // Convert to JSON for storage
    const jsonContent = JSON.stringify(draftContent);
    
    // Save to script_drafts table
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: userId,
        draft_content: JSON.parse(jsonContent),
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
    console.error('Error in saveLineDrafts:', error);
    return false;
  }
};
