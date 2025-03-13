
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Fetch script content from the database
 */
export const fetchScriptContent = async (
  scriptId: string,
  signal?: AbortSignal
): Promise<LineData[]> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('*')
      .eq('script_id', scriptId)
      .single();
    
    if (error) {
      console.error('Error fetching script content:', error);
      return [];
    }
    
    if (!data) {
      console.error('No script content found');
      return [];
    }
    
    // Transform to LineData format for compatibility
    const content = data.content_delta as DeltaContent;
    
    // Create a single LineData entry with the full Delta
    const lineData: LineData[] = [{
      uuid: scriptId, // Use script ID as the UUID
      lineNumber: 1,
      content: content,
      originalAuthor: null,
      editedBy: [],
      hasDraft: false
    }];
    
    return lineData;
  } catch (error) {
    console.error('Error in fetchScriptContent:', error);
    return [];
  }
};
