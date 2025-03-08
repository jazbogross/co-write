
import { DeltaContent } from '@/utils/editor/types';
import { safelyParseDelta, isDeltaObject } from '@/utils/editor';
import { logDraftLoading, logDeltaStructure } from '@/utils/suggestions/draftLoggingUtils';

/**
 * Attempts to parse draft content as Delta if possible, otherwise returns as is
 * Updated to fix double-parsing issue and handle both stringified and raw Delta objects
 */
export const parseDraftContent = (draft: string | any): string | DeltaContent => {
  logDraftLoading(`🔍 DEBUG: parseDraftContent called with type: ${typeof draft}`);
  
  // 1. If it's already a valid Delta object, just return it
  if (typeof draft === 'object' && draft !== null) {
    logDraftLoading(`🔍 DEBUG: Draft is an object`);
    
    if (isDeltaObject(draft)) {
      logDraftLoading(`🔍 DEBUG: Draft is already a valid Delta object`);
      if (draft.ops) {
        logDraftLoading(`🔍 DEBUG: Delta has ${draft.ops.length} operations`);
      }
      logDeltaStructure(draft);
      return draft;
    } else {
      logDraftLoading(`🔍 DEBUG: Draft is an object but not a valid Delta`);
    }
  }
  
  // 2. If it's a string, try to parse it as a Delta
  if (typeof draft === 'string') {
    logDraftLoading(`🔍 DEBUG: Draft is a string, length: ${draft.length}`);
    logDraftLoading(`🔍 DEBUG: Draft preview: ${draft.substring(0, 100)}${draft.length > 100 ? '...' : ''}`);
    
    // Skip parsing for plain text that doesn't look like JSON
    if (!draft.startsWith('{') && !draft.startsWith('[')) {
      logDraftLoading('🔍 DEBUG: Draft is plain text, returning as-is');
      return draft;
    }
    
    try {
      // Try to parse as JSON first
      logDraftLoading('🔍 DEBUG: Attempting to parse string as Delta');
      const possibleDelta = safelyParseDelta(draft);
      
      if (possibleDelta) {
        logDraftLoading(`🔍 DEBUG: Successfully parsed draft as Delta object`);
        if (possibleDelta.ops) {
          logDraftLoading(`🔍 DEBUG: Parsed Delta has ${possibleDelta.ops.length} operations`);
        }
        logDeltaStructure(possibleDelta);
        return possibleDelta;
      } else {
        logDraftLoading(`🔍 DEBUG: String could not be parsed as a valid Delta`);
      }
    } catch (e) {
      logDraftLoading(`🔍 DEBUG: Error parsing draft as Delta: ${e.message}`);
    }
  }
  
  // 3. Return the original content if parsing failed
  logDraftLoading(`🔍 DEBUG: Returning draft in original format: ${typeof draft}`);
  return draft;
};
