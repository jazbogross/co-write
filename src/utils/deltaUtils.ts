
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';

/**
 * Saves content to the database as a Delta
 */
export const saveContent = async (
  scriptId: string,
  content: string,
  lineData: any[] = []
): Promise<boolean> => {
  try {
    // Parse content to ensure it's valid JSON
    let contentObject;
    try {
      contentObject = typeof content === 'string' ? JSON.parse(content) : content;
    } catch (e) {
      console.error('Invalid content format:', e);
      return false;
    }
    
    // Check if content exists
    const { data: existingData, error: checkError } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing content:', checkError);
      return false;
    }
    
    // If no content exists, create it
    if (!existingData) {
      const { error: insertError } = await supabase
        .from('script_content')
        .insert({
          script_id: scriptId,
          content_delta: contentObject,
          updated_at: new Date().toISOString(),
          version: 1
        });
      
      if (insertError) {
        console.error('Error creating content:', insertError);
        return false;
      }
    } else {
      // If content exists, update it
      const { error: updateError } = await supabase
        .from('script_content')
        .update({
          content_delta: contentObject,
          updated_at: new Date().toISOString()
        })
        .eq('script_id', scriptId);
      
      if (updateError) {
        console.error('Error updating content:', updateError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveContent:', error);
    return false;
  }
};

/**
 * Loads content from the database
 */
export const loadContent = async (scriptId: string): Promise<any | null> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading content:', error);
      return null;
    }
    
    if (!data?.content_delta) {
      console.log('No content found for script:', scriptId);
      return { ops: [{ insert: '\n' }] };
    }
    
    return data.content_delta;
  } catch (error) {
    console.error('Error in loadContent:', error);
    return null;
  }
};

/**
 * Creates a suggestion based on the differences
 */
export const createSuggestion = async (
  scriptId: string,
  userId: string,
  deltaContent: DeltaStatic
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: deltaContent,
        status: 'pending'
      });
    
    if (error) {
      console.error('Error creating suggestion:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in createSuggestion:', error);
    return false;
  }
};
