
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

/**
 * Save user suggestions to the database
 */
export const saveSuggestions = async (
  scriptId: string,
  lineData: LineData[],
  content: string | DeltaContent | null,
  userId: string
): Promise<boolean> => {
  try {
    console.log('💾 Saving suggestions:', { scriptId, userId });
    
    // First, get the current content to compare against
    const { data: currentContent } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .single();
    
    if (!currentContent?.content_delta) {
      console.error('No current content found for script');
      return false;
    }
    
    // Determine what to use as the suggestion content
    const suggestionContent = content || (lineData.length > 0 ? lineData[0].content : null);
    
    if (!suggestionContent) {
      console.error('No suggestion content provided');
      return false;
    }
    
    // Format the content as a Delta object
    const deltaDiff = isDeltaObject(suggestionContent) 
      ? suggestionContent 
      : { ops: [{ insert: String(suggestionContent) }] };
    
    // Convert Delta to a JSON-serializable format
    const jsonContent = JSON.stringify(deltaDiff);
    
    // Create the suggestion record
    const { error } = await supabase
      .from('script_suggestions')
      .insert({
        id: uuidv4(),
        script_id: scriptId,
        user_id: userId,
        delta_diff: JSON.parse(jsonContent),
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
