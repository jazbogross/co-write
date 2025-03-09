
import { supabase } from '@/integrations/supabase/client';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Fetches original lines from script_content for a given script
 */
export const fetchScriptContent = async (scriptId: string, signal?: AbortSignal) => {
  try {
    const query = supabase
      .from('script_content')
      .select('id, line_number, content')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });

    // Add abort signal to the request if provided
    if (signal) {
      query.abortSignal(signal);
    }

    const { data: originalLines, error: originalLinesError } = await query;
      
    if (originalLinesError) {
      logDraftLoading('Error fetching original lines:', originalLinesError);
      return null;
    }
    
    if (!originalLines || originalLines.length === 0) {
      logDraftLoading('No original lines found for script:', scriptId);
      return null;
    }
    
    logDraftLoading(`Found ${originalLines.length} original lines`);
    return originalLines;
  } catch (error) {
    logDraftLoading('Error fetching script content:', error);
    return null;
  }
};
