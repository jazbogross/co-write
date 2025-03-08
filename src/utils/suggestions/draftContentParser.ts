
import { DeltaContent } from '@/utils/editor/types';
import { safelyParseDelta } from '@/utils/editor';
import { logDraftLoading, logDeltaStructure } from '@/utils/suggestions/draftLoggingUtils';

/**
 * Attempts to parse draft content as Delta if possible, otherwise returns as is
 */
export const parseDraftContent = (draft: string): string | DeltaContent => {
  // Try to parse draft as Delta if it's a JSON object
  let draftContent: string | DeltaContent = draft;
  let parseSuccess = false;
  
  try {
    if (typeof draft === 'string' && (
        draft.startsWith('{') || 
        draft.startsWith('[')
    )) {
      const parsedDraft = safelyParseDelta(draft);
      if (parsedDraft) {
        draftContent = parsedDraft;
        parseSuccess = true;
        logDraftLoading(`Parsed draft as Delta object`);
        logDeltaStructure(parsedDraft);
      }
    }
  } catch (e) {
    logDraftLoading(`Draft is not a valid JSON/Delta:`, e);
  }
  
  return draftContent;
};
