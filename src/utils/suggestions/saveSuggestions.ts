
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

/**
 * Save suggestions to the database
 */
export const saveSuggestions = async (
  scriptId: string,
  lineData: LineData[],
  originalContent: string,
  userId: string
): Promise<boolean> => {
  try {
    // For the new approach, we use a single Delta diff
    // Get the original content first
    const { data: scriptData } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .single();
    
    if (!scriptData) {
      console.error('Original script content not found');
      return false;
    }
    
    // Extract suggested content (Delta) from lineData
    // In the simplified approach, we would expect a single Delta
    let suggestedContent: DeltaContent;
    
    if (lineData.length > 0 && isDeltaObject(lineData[0].content)) {
      suggestedContent = lineData[0].content;
    } else {
      // Fallback to building from line data
      suggestedContent = {
        ops: lineData.flatMap(line => {
          const content = isDeltaObject(line.content) 
            ? line.content.ops 
            : [{ insert: String(line.content) + '\n' }];
          return content;
        })
      };
    }
    
    // Compare original and suggested content to generate diff
    // Using QuillJS Delta, we can generate a diff
    // For now, just store the entire suggested Delta
    
    // Save to script_suggestions table
    const { error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: suggestedContent,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Error saving suggestion:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveSuggestions:', error);
    return false;
  }
};
