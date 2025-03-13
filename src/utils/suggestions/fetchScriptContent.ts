
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
    let content: DeltaContent;
    
    // Handle different content formats
    if (data.content_delta) {
      if (typeof data.content_delta === 'object') {
        content = data.content_delta as unknown as DeltaContent;
      } else if (typeof data.content_delta === 'string') {
        try {
          content = JSON.parse(data.content_delta) as DeltaContent;
        } catch (e) {
          // If parse fails, create a minimal Delta with the string
          content = { ops: [{ insert: data.content_delta + '\n' }] };
        }
      } else {
        // Default empty Delta
        content = { ops: [{ insert: '\n' }] };
      }
    } else {
      // Default empty Delta
      content = { ops: [{ insert: '\n' }] };
    }
    
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
