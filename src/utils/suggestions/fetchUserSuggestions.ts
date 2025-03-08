
import { supabase } from '@/integrations/supabase/client';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Fetches user's draft suggestions from script_suggestions for a given script
 */
export const fetchUserSuggestions = async (scriptId: string, userId: string) => {
  try {
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('script_suggestions')
      .select('id, line_uuid, line_number, line_number_draft, content, draft')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (suggestionsError) {
      logDraftLoading('Error fetching suggestions:', suggestionsError);
      return null;
    }
    
    if (!suggestions || suggestions.length === 0) {
      logDraftLoading('No draft suggestions found for this script/user combination');
    } else {
      logDraftLoading(`Found ${suggestions.length} draft suggestions`);
    }
    
    return suggestions || [];
  } catch (error) {
    logDraftLoading('Error fetching user suggestions:', error);
    return [];
  }
};
