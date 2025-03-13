
import { supabase } from '@/integrations/supabase/client';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Fetch user suggestions for a script
 */
export const fetchUserSuggestions = async (
  scriptId: string,
  userId: string | null
): Promise<any[]> => {
  if (!scriptId || !userId) {
    logDraftLoading('fetchUserSuggestions aborted: missing scriptId or userId');
    return [];
  }
  
  try {
    // Get user's draft suggestions for this script
    const { data, error } = await supabase
      .from('script_suggestions')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'draft');
    
    if (error) {
      logDraftLoading(`Error fetching user suggestions: ${error.message}`);
      return [];
    }
    
    return data || [];
  } catch (error) {
    logDraftLoading(`Unexpected error in fetchUserSuggestions: ${error}`);
    return [];
  }
};
