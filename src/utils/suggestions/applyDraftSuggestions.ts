
import { LineData } from '@/types/lineTypes';
import { parseDraftContent } from './draftContentParser';
import { logDraftLoading } from './draftLoggingUtils';

/**
 * Applies draft suggestions to the line data
 * Updated to handle Delta objects more reliably
 */
export const applyDraftSuggestions = (
  suggestions: any[],
  lineDataMap: Map<string, LineData>,
  initialLineData: LineData[],
  userId: string | null
): { 
  processedDraftLines: LineData[],
  appliedSuggestionCount: number
} => {
  let appliedSuggestionCount = 0;
  let processedDraftLines: LineData[] = [...initialLineData];
  
  logDraftLoading(`Processing ${suggestions.length} suggestions`);
  
  for (const suggestion of suggestions) {
    // Skip suggestions with null drafts or deleted drafts
    if (!suggestion.draft || suggestion.draft === '{deleted-uuid}') {
      continue;
    }
    
    // Log the raw draft content type and structure
    logDraftLoading(`Processing suggestion with draft of type: ${typeof suggestion.draft}`);
    if (typeof suggestion.draft === 'object') {
      logDraftLoading(`Draft object structure: ${JSON.stringify(suggestion.draft).substring(0, 100)}...`);
    } else if (typeof suggestion.draft === 'string') {
      logDraftLoading(`Draft string preview: ${suggestion.draft.substring(0, 100)}...`);
    }
    
    // Try to find the line by UUID first (most accurate)
    if (suggestion.line_uuid && lineDataMap.has(suggestion.line_uuid)) {
      const lineData = lineDataMap.get(suggestion.line_uuid)!;
      
      // Parse and update the line with draft content
      const draftContent = parseDraftContent(suggestion.draft);
      logDraftLoading(`Parsed draft content type: ${typeof draftContent}`);
      
      lineData.content = draftContent;
      lineData.hasDraft = true;
      
      // Update line number if provided
      if (suggestion.line_number_draft) {
        lineData.lineNumber = suggestion.line_number_draft;
      }
      
      appliedSuggestionCount++;
      logDraftLoading(`Applied draft to line UUID ${suggestion.line_uuid}, new line number: ${lineData.lineNumber}`);
    } 
    // If line_uuid lookup fails, try line_number
    else if (suggestion.line_number) {
      // Find the line with the matching line number
      const lineIndex = initialLineData.findIndex(line => line.lineNumber === suggestion.line_number);
      if (lineIndex >= 0) {
        const lineData = initialLineData[lineIndex];
        
        // Parse and update the line with draft content
        const draftContent = parseDraftContent(suggestion.draft);
        logDraftLoading(`Parsed draft content type: ${typeof draftContent}`);
        
        lineData.content = draftContent;
        lineData.hasDraft = true;
        
        // Update line number if provided
        if (suggestion.line_number_draft) {
          lineData.lineNumber = suggestion.line_number_draft;
        }
        
        appliedSuggestionCount++;
        logDraftLoading(`Applied draft to line number ${suggestion.line_number}, new line number: ${lineData.lineNumber}`);
      } else {
        logDraftLoading(`Could not find line with number ${suggestion.line_number}`);
      }
    }
    // If this is a new line (no line_uuid or line_number)
    else if (suggestion.line_number_draft) {
      // Create a new line with the draft content
      const newUuid = suggestion.line_uuid || suggestion.id; // Use line_uuid if available, otherwise use suggestion id
      
      // Parse draft content
      const draftContent = parseDraftContent(suggestion.draft);
      logDraftLoading(`New line draft content type: ${typeof draftContent}`);
      
      const newLine: LineData = {
        uuid: newUuid,
        lineNumber: suggestion.line_number_draft,
        content: draftContent,
        originalAuthor: userId,
        editedBy: [],
        hasDraft: true
      };
      
      processedDraftLines.push(newLine);
      appliedSuggestionCount++;
      logDraftLoading(`Added new line with UUID ${newUuid} at line number ${suggestion.line_number_draft}`);
    }
  }
  
  logDraftLoading(`Applied a total of ${appliedSuggestionCount} suggestions`);
  
  return { processedDraftLines, appliedSuggestionCount };
};
