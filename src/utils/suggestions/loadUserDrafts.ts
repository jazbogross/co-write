
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
  
  logDraftLoading('Loading drafts for user:', userId);
  
  try {
    // 1. Fetch original content lines
    const originalLines = await fetchScriptContent(scriptId);
    if (!originalLines) return [];
    
    // 2. Fetch user suggestions
    const suggestions = await fetchUserSuggestions(scriptId, userId);
    
    // 3. Build initial line data
    const { lineDataMap, initialLineData } = buildInitialLineData(
      originalLines, 
      contentToUuidMapRef
    );
    
    // 4. If no suggestions, return initial line data
    if (suggestions.length === 0) {
      return initialLineData;
    }
    
    // 5. Apply draft suggestions
    const { processedDraftLines, appliedSuggestionCount } = applyDraftSuggestions(
      suggestions,
      lineDataMap,
      initialLineData,
      userId
    );
    
    // 6. Finalize line data
    return finalizeLineData(processedDraftLines, appliedSuggestionCount);
    
  } catch (error) {
    logDraftLoading('Error loading user drafts:', error);
    return [];
  }
};
