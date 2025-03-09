
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
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  signal?: AbortSignal
): Promise<LineData[]> => {
  if (!scriptId || !userId) {
    logDraftLoading('loadUserDrafts aborted: missing scriptId or userId');
    return [];
  }
  
  logDraftLoading(`🔍 DEBUG: Loading drafts from script_suggestions for user: ${userId}, script: ${scriptId}`);
  
  try {
    // 1. Fetch original content lines
    logDraftLoading('🔍 DEBUG: Step 1 - Fetching original content lines');
    const originalLines = await fetchScriptContent(scriptId, signal);
    if (!originalLines) {
      logDraftLoading('🔍 DEBUG: No original lines found');
      return [];
    }
    
    logDraftLoading(`🔍 DEBUG: Fetched ${originalLines.length} original content lines`);
    
    // 2. Fetch user suggestions from script_suggestions table
    logDraftLoading('🔍 DEBUG: Step 2 - Fetching user suggestions from script_suggestions table');
    const suggestions = await fetchUserSuggestions(scriptId, userId, signal);
    logDraftLoading(`🔍 DEBUG: Fetched ${suggestions.length} user suggestions from script_suggestions table`);
    
    // 3. Build initial line data
    logDraftLoading('🔍 DEBUG: Step 3 - Building initial line data');
    const { lineDataMap, initialLineData } = buildInitialLineData(
      originalLines, 
      contentToUuidMapRef
    );
    
    // 4. If no suggestions, return initial line data
    if (suggestions.length === 0) {
      logDraftLoading('🔍 DEBUG: No suggestions found in script_suggestions table, returning original content');
      return initialLineData;
    }
    
    // 5. Apply draft suggestions from script_suggestions table
    logDraftLoading('🔍 DEBUG: Step 5 - Applying draft suggestions from script_suggestions table');
    const { processedDraftLines, appliedSuggestionCount } = applyDraftSuggestions(
      suggestions,
      lineDataMap,
      initialLineData,
      userId
    );
    
    logDraftLoading(`🔍 DEBUG: Applied ${appliedSuggestionCount} draft suggestions from script_suggestions table`);
    
    // 6. Finalize line data
    logDraftLoading('🔍 DEBUG: Step 6 - Finalizing line data with drafts from script_suggestions');
    const finalizedData = finalizeLineData(processedDraftLines, appliedSuggestionCount);
    logDraftLoading(`🔍 DEBUG: Finalized ${finalizedData.length} lines with drafts from script_suggestions`);
    
    return finalizedData;
    
  } catch (error) {
    logDraftLoading('🔍 DEBUG: Error loading user drafts from script_suggestions:', error);
    return [];
  }
};
