
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
  
  logDraftLoading(`🔍 DEBUG: Loading drafts for user: ${userId}, script: ${scriptId}`);
  
  try {
    // 1. Fetch original content lines
    logDraftLoading('🔍 DEBUG: Step 1 - Fetching original content lines');
    const originalLines = await fetchScriptContent(scriptId);
    if (!originalLines) {
      logDraftLoading('🔍 DEBUG: No original lines found');
      return [];
    }
    
    logDraftLoading(`🔍 DEBUG: Fetched ${originalLines.length} original content lines`);
    
    // Log sample of original content
    if (originalLines.length > 0) {
      const sample = originalLines[0];
      logDraftLoading(`🔍 DEBUG: Original content sample - line_number: ${sample.line_number}, content type: ${typeof sample.content}`);
      logDraftLoading(`🔍 DEBUG: Original content preview: ${
        typeof sample.content === 'string' 
          ? sample.content.substring(0, 50) 
          : JSON.stringify(sample.content).substring(0, 50)
      }...`);
    }
    
    // 2. Fetch user suggestions
    logDraftLoading('🔍 DEBUG: Step 2 - Fetching user suggestions');
    const suggestions = await fetchUserSuggestions(scriptId, userId);
    logDraftLoading(`🔍 DEBUG: Fetched ${suggestions.length} user suggestions`);
    
    // Log a sample of the suggestion data for debugging
    if (suggestions.length > 0) {
      const sample = suggestions[0];
      logDraftLoading(`🔍 DEBUG: Sample suggestion - line_uuid: ${sample.line_uuid}, draft type: ${typeof sample.draft}`);
      
      if (typeof sample.draft === 'string') {
        logDraftLoading(`🔍 DEBUG: Sample draft content: ${sample.draft.substring(0, 100)}`);
      } else if (sample.draft && typeof sample.draft === 'object') {
        logDraftLoading(`🔍 DEBUG: Sample draft content (object): ${JSON.stringify(sample.draft).substring(0, 100)}`);
      }
    } else {
      logDraftLoading('🔍 DEBUG: No suggestions found, will return original content');
    }
    
    // 3. Build initial line data
    logDraftLoading('🔍 DEBUG: Step 3 - Building initial line data');
    const { lineDataMap, initialLineData } = buildInitialLineData(
      originalLines, 
      contentToUuidMapRef
    );
    
    // Log a sample of initial line data
    if (initialLineData.length > 0) {
      const sample = initialLineData[0];
      logDraftLoading(`🔍 DEBUG: Initial line data sample - uuid: ${sample.uuid}, content type: ${typeof sample.content}`);
    }
    
    // 4. If no suggestions, return initial line data
    if (suggestions.length === 0) {
      logDraftLoading('🔍 DEBUG: No suggestions found, returning original content');
      return initialLineData;
    }
    
    // 5. Apply draft suggestions
    logDraftLoading('🔍 DEBUG: Step 5 - Applying draft suggestions');
    const { processedDraftLines, appliedSuggestionCount } = applyDraftSuggestions(
      suggestions,
      lineDataMap,
      initialLineData,
      userId
    );
    
    logDraftLoading(`🔍 DEBUG: Applied ${appliedSuggestionCount} draft suggestions`);
    
    // 6. Finalize line data
    logDraftLoading('🔍 DEBUG: Step 6 - Finalizing line data');
    const finalizedData = finalizeLineData(processedDraftLines, appliedSuggestionCount);
    logDraftLoading(`🔍 DEBUG: Finalized ${finalizedData.length} lines with drafts`);
    
    // Log a sample of finalized data
    if (finalizedData.length > 0) {
      const sample = finalizedData[0];
      logDraftLoading(`🔍 DEBUG: Finalized data sample - uuid: ${sample.uuid}, content type: ${typeof sample.content}, hasDraft: ${sample.hasDraft}`);
      logDraftLoading(`🔍 DEBUG: Finalized content preview: ${
        typeof sample.content === 'string' 
          ? sample.content.substring(0, 50) 
          : JSON.stringify(sample.content).substring(0, 50)
      }...`);
    }
    
    return finalizedData;
    
  } catch (error) {
    logDraftLoading('🔍 DEBUG: Error loading user drafts:', error);
    return [];
  }
};
