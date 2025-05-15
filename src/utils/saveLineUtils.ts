
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from '@/utils/editor/quill-types';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { normalizeContentForStorage } from '@/utils/deltaUtils';

/**
 * Saves content to the database as a full Delta
 */
export const saveContent = async (
  scriptId: string,
  content: string | DeltaContent | DeltaStatic,
  lineData: LineData[]
): Promise<boolean> => {
  try {
    // Convert content to Delta if needed
    const deltaContent = typeof content === 'string'
      ? { ops: [{ insert: content }] }
      : content;
    
    // Update script content directly in scripts table
    const { error: updateError } = await supabase
      .from('scripts')
      .update({
        content: normalizeContentForStorage(deltaContent),
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId);
    
    if (updateError) {
      console.error('Error updating content:', updateError);
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
export const loadContent = async (scriptId: string): Promise<DeltaStatic | null> => {
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('content')
      .eq('id', scriptId)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading content:', error);
      return null;
    }
    
    if (!data?.content) {
      console.error('No content found for script:', scriptId);
      return { ops: [{ insert: '\n' }] } as unknown as DeltaStatic;
    }
    
    // Parse Delta content if needed
    const deltaContent = typeof data.content === 'string'
      ? JSON.parse(data.content)
      : data.content;
    
    return deltaContent as unknown as DeltaStatic;
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
  content: DeltaContent | DeltaStatic,
  versionName: string,
  userId: string | null
): Promise<boolean> => {
  if (!userId) return false;
  
  try {
    // Get current version number
    const { data: currentData } = await supabase
      .from('scripts')
      .select('updated_at')
      .eq('id', scriptId)
      .single();
    
    // Save version to script_versions table
    const { error } = await supabase
      .from('script_versions')
      .insert({
        script_id: scriptId,
        version_number: 1, // Start with version 1 since we no longer track in content table
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
