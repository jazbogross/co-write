
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

/**
 * Save line drafts to the database
 */
export const saveLineDrafts = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string
): Promise<boolean> => {
  try {
    if (!lineData || lineData.length === 0) {
      console.error('No line data to save');
      return false;
    }
    
    // Extract draft content (Delta) from lineData
    let draftContent: DeltaContent;
    
    if (isDeltaObject(lineData[0].content)) {
      draftContent = lineData[0].content;
    } else {
      // Fallback: Build Delta from lineData
      draftContent = {
        ops: lineData.flatMap(line => {
          const content = isDeltaObject(line.content) 
            ? line.content.ops 
            : [{ insert: String(line.content) + '\n' }];
          return content;
        })
      };
    }
    
    // Convert to JSON for Supabase
    const jsonContent = JSON.parse(JSON.stringify(draftContent));
    
    // Save to script_drafts table
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: userId,
        draft_content: jsonContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id,user_id'
      });
    
    if (error) {
      console.error('Error saving line drafts:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveLineDrafts:', error);
    return false;
  }
};
