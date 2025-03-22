
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { normalizeContentForStorage } from '@/utils/suggestions/contentUtils';

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
    
    // First check if content exists
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
          content_delta: normalizeContentForStorage(deltaContent),
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
          content_delta: normalizeContentForStorage(deltaContent),
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
export const loadContent = async (scriptId: string): Promise<DeltaContent | null> => {
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
      console.error('No content found for script:', scriptId);
      return { ops: [{ insert: '\n' }] };
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

/**
 * Save a named version of the script content
 */
export const saveNamedVersion = async (
  scriptId: string, 
  content: DeltaContent,
  versionName: string,
  userId: string | null
): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // Get current version number
    const { data: currentData } = await supabase
      .from('script_content')
      .select('version')
      .eq('script_id', scriptId)
      .single();
    
    const versionNumber = (currentData?.version || 0) + 1;
    
    // Save version to script_versions table
    const { error } = await supabase
      .from('script_versions')
      .insert({
        script_id: scriptId,
        version_number: versionNumber,
        content_delta: normalizeContentForStorage(content),
        created_by: userId,
        version_name: versionName
      });
    
    if (error) {
      console.error('Error saving version:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveNamedVersion:', error);
    return false;
  }
};
