
import { supabase } from '@/integrations/supabase/client';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Fetches original lines from script_content for a given script
 */
export const fetchScriptContent = async (scriptId: string) => {
  try {
    const { data: originalLines, error: originalLinesError } = await supabase
      .from('script_content')
      .select('id, line_number, content')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
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
