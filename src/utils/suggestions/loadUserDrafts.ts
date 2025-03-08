
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { logDraftLoading } from './draftLoggingUtils';
import { fetchScriptContent } from './fetchScriptContent';
import { fetchUserSuggestions } from './fetchUserSuggestions';
import { buildInitialLineData } from './buildInitialLineData';
import { applyDraftSuggestions } from './applyDraftSuggestions';
import { finalizeLineData } from './finalizeLineData';

/**
 * Loads user draft suggestions from the script_suggestions table
 * Returns processed line data with drafts applied
 */
export const loadUserDrafts = async (
  scriptId: string,
  userId: string | null,
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
): Promise<LineData[]> => {
  if (!scriptId || !userId) {
    logDraftLoading('loadUserDrafts aborted: missing scriptId or userId');
    return [];
  }
  
  logDraftLoading(`Loading drafts for user: ${userId}, script: ${scriptId}`);
  
  try {
    // 1. Fetch original content lines
    const originalLines = await fetchScriptContent(scriptId);
    if (!originalLines) return [];
    
    logDraftLoading(`Fetched ${originalLines.length} original content lines`);
    
    // 2. Fetch user suggestions
    const suggestions = await fetchUserSuggestions(scriptId, userId);
    logDraftLoading(`Fetched ${suggestions.length} user suggestions`);
    
    // Log a sample of the suggestion data for debugging
    if (suggestions.length > 0) {
      const sample = suggestions[0];
      logDraftLoading(`Sample suggestion - line_uuid: ${sample.line_uuid}, draft type: ${typeof sample.draft}`);
      if (typeof sample.draft === 'string') {
        logDraftLoading(`Sample draft content (first 100 chars): ${sample.draft.substring(0, 100)}`);
      }
    }
    
    // 3. Build initial line data
    const { lineDataMap, initialLineData } = buildInitialLineData(
      originalLines, 
      contentToUuidMapRef
    );
    
    // 4. If no suggestions, return initial line data
    if (suggestions.length === 0) {
      logDraftLoading('No suggestions found, returning original content');
      return initialLineData;
    }
    
    // 5. Apply draft suggestions
    const { processedDraftLines, appliedSuggestionCount } = applyDraftSuggestions(
      suggestions,
      lineDataMap,
      initialLineData,
      userId
    );
    
    logDraftLoading(`Applied ${appliedSuggestionCount} draft suggestions`);
    
    // 6. Finalize line data
    const finalizedData = finalizeLineData(processedDraftLines, appliedSuggestionCount);
    logDraftLoading(`Finalized ${finalizedData.length} lines with drafts`);
    
    return finalizedData;
    
  } catch (error) {
    logDraftLoading('Error loading user drafts:', error);
    return [];
  }
};
