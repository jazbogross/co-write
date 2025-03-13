
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Save lines to the database
 */
export const saveLinesToDatabase = async (
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
