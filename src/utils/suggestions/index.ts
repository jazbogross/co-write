
// Re-export all suggestion-related utilities
export { saveSuggestions } from './saveSuggestions';
export { saveLineDrafts } from './saveLineDrafts';
export { fetchScriptContent } from './fetchScriptContent';
export { buildInitialLineData } from './buildInitialLineData';
export { finalizeLineData } from './finalizeLineData';
export { parseDraftContent } from './draftContentParser';
export { logDraftLoading } from './draftLoggingUtils';

// Stub for missing exports
export const fetchUserSuggestions = async (scriptId: string, userId: string) => {
  console.log('fetchUserSuggestions stub called with:', { scriptId, userId });
  return [];
};
