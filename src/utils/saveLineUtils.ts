
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { combineDeltaContents } from '@/utils/editor/operations/deltaCombination';

/**
 * Saves content to the database as a full Delta
 */
export const saveContent = async (
  scriptId: string,
  content: string | DeltaContent,
  lineData: LineData[]
): Promise<boolean> => {
  try {
    // Convert content to Delta if needed
    const deltaContent = typeof content === 'string'
      ? { ops: [{ insert: content }] }
      : content;
    
    // Update script_content table with the full Delta
    const { error } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: deltaContent as any,
        updated_at: new Date().toISOString()
      }, { onConflict: 'script_id' });
    
    if (error) {
      console.error('Error saving content:', error);
      return false;
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
export const loadContent = async (scriptId: string): Promise<DeltaContent | null> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .single();
    
    if (error) {
      console.error('Error loading content:', error);
      return null;
    }
    
    if (!data?.content_delta) {
      console.error('No content found for script:', scriptId);
      return null;
    }
    
    // Parse Delta content if needed
    const deltaContent = typeof data.content_delta === 'string'
      ? JSON.parse(data.content_delta)
      : data.content_delta;
    
    return deltaContent as DeltaContent;
  } catch (error) {
    console.error('Error in loadContent:', error);
    return null;
  }
};
