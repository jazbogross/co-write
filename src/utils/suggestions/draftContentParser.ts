
import { DeltaContent } from '@/utils/editor/types';
import { safelyParseDelta, validateDelta } from '@/utils/editor';
import { logDraftLoading, logDeltaStructure } from '@/utils/suggestions/draftLoggingUtils';

/**
 * Attempts to parse draft content as Delta if possible, otherwise returns as is
 * Updated to fix double-parsing issue and handle both stringified and raw Delta objects
 */
export const parseDraftContent = (draft: string | any): string | DeltaContent => {
  // 1. If it's already a valid Delta object, just return it
  if (typeof draft === 'object' && draft !== null) {
    const validationResult = validateDelta(draft);
    if (validationResult.valid) {
      logDraftLoading(`Draft is already a valid Delta object`);
      logDeltaStructure(draft);
      return draft;
    }
  }
  
  // 2. If it's a string, try to parse it as a Delta
  if (typeof draft === 'string') {
    // Skip parsing for plain text that doesn't look like JSON
    if (!draft.startsWith('{') && !draft.startsWith('[')) {
      logDraftLoading('Draft is plain text, returning as-is');
      return draft;
    }
    
    try {
      // Try to parse as JSON first
      const possibleDelta = safelyParseDelta(draft);
      if (possibleDelta) {
        logDraftLoading(`Successfully parsed draft as Delta object`);
        logDeltaStructure(possibleDelta);
        return possibleDelta;
      }
    } catch (e) {
      logDraftLoading(`Draft is not a valid JSON/Delta:`, e);
    }
  }
  
  // 3. Return the original content if parsing failed
  logDraftLoading(`Returning draft in original format: ${typeof draft}`);
  return draft;
};
