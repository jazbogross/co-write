
import { supabase } from '@/integrations/supabase/client';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Fetches user's draft suggestions from script_suggestions for a given script
 */
export const fetchUserSuggestions = async (scriptId: string, userId: string) => {
  try {
    logDraftLoading(`🔍 DEBUG: Fetching suggestions from script_suggestions table for script ${scriptId} and user ${userId}`);
    
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('script_suggestions')
      .select('id, line_uuid, line_number, line_number_draft, content, draft')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (suggestionsError) {
      logDraftLoading('🔍 DEBUG: Error fetching suggestions from script_suggestions:', suggestionsError);
      return null;
    }
    
    if (!suggestions || suggestions.length === 0) {
      logDraftLoading('🔍 DEBUG: No draft suggestions found in script_suggestions table');
    } else {
      logDraftLoading(`🔍 DEBUG: Found ${suggestions.length} draft suggestions in script_suggestions table`);
      
      // Log detailed information about first 2 suggestions only
      suggestions.slice(0, 2).forEach((suggestion, index) => {
        logDraftLoading(`🔍 DEBUG: Suggestion ${index+1} from script_suggestions:`, {
          id: suggestion.id,
          line_uuid: suggestion.line_uuid,
          line_number: suggestion.line_number,
          draft_type: typeof suggestion.draft,
          draft_preview: suggestion.draft ? 
            (typeof suggestion.draft === 'string' ? 
              suggestion.draft.substring(0, 30) + '...' : 
              JSON.stringify(suggestion.draft).substring(0, 30) + '...') : 
            'null'
        });
      });
    }
    
    return suggestions || [];
  } catch (error) {
    logDraftLoading('🔍 DEBUG: Error fetching user suggestions from script_suggestions:', error);
    return [];
  }
};
