
import { supabase } from '@/integrations/supabase/client';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Fetches user's draft suggestions from script_suggestions for a given script
 */
export const fetchUserSuggestions = async (scriptId: string, userId: string) => {
  try {
    logDraftLoading(`🔍 DEBUG: Fetching suggestions for script ${scriptId} and user ${userId}`);
    
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('script_suggestions')
      .select('id, line_uuid, line_number, line_number_draft, content, draft')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (suggestionsError) {
      logDraftLoading('🔍 DEBUG: Error fetching suggestions:', suggestionsError);
      return null;
    }
    
    if (!suggestions || suggestions.length === 0) {
      logDraftLoading('🔍 DEBUG: No draft suggestions found for this script/user combination');
    } else {
      logDraftLoading(`🔍 DEBUG: Found ${suggestions.length} draft suggestions`);
      
      // Log detailed information about each suggestion
      suggestions.forEach((suggestion, index) => {
        if (index < 5) { // Log first 5 suggestions to avoid log flooding
          logDraftLoading(`🔍 DEBUG: Suggestion ${index+1}:`, {
            id: suggestion.id,
            line_uuid: suggestion.line_uuid,
            line_number: suggestion.line_number,
            line_number_draft: suggestion.line_number_draft,
            content_type: typeof suggestion.content,
            draft_type: typeof suggestion.draft,
            draft_preview: suggestion.draft ? 
              (typeof suggestion.draft === 'string' ? 
                suggestion.draft.substring(0, 50) : 
                JSON.stringify(suggestion.draft).substring(0, 50)) + '...' : 
              'null'
          });
          
          // Try to detect if the draft is a stringified JSON/Delta
          if (typeof suggestion.draft === 'string' && 
              (suggestion.draft.startsWith('{') || suggestion.draft.startsWith('['))) {
            try {
              const parsed = JSON.parse(suggestion.draft);
              logDraftLoading(`🔍 DEBUG: Suggestion ${index+1} draft appears to be stringified JSON/Delta:`, 
                              parsed.ops ? `Delta with ${parsed.ops.length} ops` : 'JSON object');
            } catch (e) {
              // Not a valid JSON
              logDraftLoading(`🔍 DEBUG: Suggestion ${index+1} draft looks like JSON but can't be parsed`);
            }
          }
        }
      });
    }
    
    return suggestions || [];
  } catch (error) {
    logDraftLoading('🔍 DEBUG: Error fetching user suggestions:', error);
    return [];
  }
};
