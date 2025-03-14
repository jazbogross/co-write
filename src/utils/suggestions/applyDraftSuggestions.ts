import { LineData } from '@/types/lineTypes';
import { parseDraftContent } from './draftContentParser';
import { logDraftLoading } from './draftLoggingUtils';
import { isDeltaObject } from '@/utils/editor';

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
  const processedDraftLines: LineData[] = [...initialLineData];
  
  logDraftLoading(`🔍 DEBUG: Processing ${suggestions.length} suggestions`);

  const getPlainTextFromDelta = (delta: any): string => {
    if (delta && Array.isArray(delta.ops)) {
      return delta.ops.map(op => typeof op.insert === 'string' ? op.insert : '').join('');
    }
    return '';
  };
  
  // Create a map for quick lookup of existing lines by number
  const lineNumberMap = new Map<number, LineData>();
  initialLineData.forEach(line => {
    lineNumberMap.set(line.lineNumber, line);
  });
  
  // Track all existing uuids to prevent duplicates
  const existingUuids = new Set(initialLineData.map(line => line.uuid));
  
  for (const suggestion of suggestions) {
    // Skip suggestions with null drafts or deleted drafts
    if (!suggestion.draft || suggestion.draft === '{deleted-uuid}') {
      logDraftLoading(`🔍 DEBUG: Skipping suggestion with null or deleted draft`);
      continue;
    }
    
    // Log the raw draft content type and structure
    logDraftLoading(`🔍 DEBUG: Processing suggestion: ${JSON.stringify({
      id: suggestion.id,
      line_uuid: suggestion.line_uuid,
      line_number: suggestion.line_number,
      line_number_draft: suggestion.line_number_draft
    })}`);
    
    logDraftLoading(`🔍 DEBUG: Draft content type: ${typeof suggestion.draft}`);
    if (typeof suggestion.draft === 'object') {
      logDraftLoading(`🔍 DEBUG: Draft object structure: ${JSON.stringify(suggestion.draft).substring(0, 100)}...`);
      logDraftLoading(`🔍 DEBUG: Is already a Delta object: ${isDeltaObject(suggestion.draft)}`);
    } else if (typeof suggestion.draft === 'string') {
      logDraftLoading(`🔍 DEBUG: Draft string preview: ${suggestion.draft.substring(0, 100)}...`);
      if (suggestion.draft.startsWith('{') || suggestion.draft.startsWith('[')) {
        try {
          const parsed = JSON.parse(suggestion.draft);
          logDraftLoading(`🔍 DEBUG: Draft appears to be stringified JSON/Delta: ${parsed.ops ? 'Has ops array' : 'No ops array'}`);
        } catch (e) {
          logDraftLoading(`🔍 DEBUG: Draft looks like JSON but can't be parsed: ${e.message}`);
        }
      }
    }
    
    // Parse draft content first to avoid duplicating the parsing
    const draftContent = parseDraftContent(suggestion.draft);
    logDraftLoading(`🔍 DEBUG: Parsed draft content type: ${typeof draftContent}`);
    logDraftLoading(`🔍 DEBUG: Is parsed content a Delta: ${isDeltaObject(draftContent)}`);

    // Log plain text conversion of the parsed content
    const parsedDraftPlainText = getPlainTextFromDelta(draftContent);
    logDraftLoading(`🔍 DEBUG: Parsed draft content plaintext: ${parsedDraftPlainText}`);
    
    // Try to find the line by UUID first (most accurate)
    if (suggestion.line_uuid && lineDataMap.has(suggestion.line_uuid)) {
      const lineData = lineDataMap.get(suggestion.line_uuid)!;
      
      // Log the original line content (converted to plain text)
      const originalPlainText = getPlainTextFromDelta(lineData.content);
      logDraftLoading(`🔍 DEBUG: Found line by UUID ${suggestion.line_uuid}:`, {
        originalContent: originalPlainText,
        lineNumber: lineData.lineNumber,
        hasDraft: lineData.hasDraft
      });
      
      // Update the line with the draft content
      lineData.content = draftContent;
      lineData.hasDraft = true;
      
      // Update line number if provided
      if (suggestion.line_number_draft) {
        logDraftLoading(`🔍 DEBUG: Updating line number from ${lineData.lineNumber} to ${suggestion.line_number_draft}`);
        lineData.lineNumber = suggestion.line_number_draft;
      }
      
      appliedSuggestionCount++;
      
      // Log the updated content in plain text
      const updatedPlainText = getPlainTextFromDelta(lineData.content);
      logDraftLoading(`🔍 DEBUG: Applied draft to line UUID ${suggestion.line_uuid}, new line number: ${lineData.lineNumber}, content: ${updatedPlainText}`);
    } 
    // If line_uuid lookup fails, try line_number
    else if (suggestion.line_number) {
      logDraftLoading(`🔍 DEBUG: Looking up line by number ${suggestion.line_number}`);
      
      // Find the line with the matching line number
      const lineData = lineNumberMap.get(suggestion.line_number);
      
      if (lineData) {
        const originalPlainText = getPlainTextFromDelta(lineData.content);
        logDraftLoading(`🔍 DEBUG: Found line by number ${suggestion.line_number}:`, {
          uuid: lineData.uuid,
          originalContent: originalPlainText,
          hasDraft: lineData.hasDraft
        });
        
        // Update the line with the draft content
        lineData.content = draftContent;
        lineData.hasDraft = true;
        
        // Update line number if provided
        if (suggestion.line_number_draft) {
          logDraftLoading(`🔍 DEBUG: Updating line number from ${lineData.lineNumber} to ${suggestion.line_number_draft}`);
          lineData.lineNumber = suggestion.line_number_draft;
        }
        
        appliedSuggestionCount++;
        const updatedPlainText = getPlainTextFromDelta(lineData.content);
        logDraftLoading(`🔍 DEBUG: Applied draft to line number ${suggestion.line_number}, new line number: ${lineData.lineNumber}, content: ${updatedPlainText}`);
      } else {
        logDraftLoading(`🔍 DEBUG: Could not find line with number ${suggestion.line_number}`);
      }
    } 
    // If this is a new line (no line_uuid or line_number matching existing lines)
    else if (suggestion.line_number_draft || suggestion.line_uuid) {
      // For new lines, we need either a line_uuid or line_number_draft
      const lineNumber = suggestion.line_number_draft || processedDraftLines.length + 1;
      logDraftLoading(`🔍 DEBUG: Creating new line at position ${lineNumber}`);
      
      // Use line_uuid if available, otherwise use suggestion id or generate a new UUID
      let uuid = suggestion.line_uuid || suggestion.id;
      
      // Ensure the UUID isn't already in use
      if (existingUuids.has(uuid)) {
        logDraftLoading(`🔍 DEBUG: Warning - UUID ${uuid} is already used, using suggestion ID instead`);
        uuid = suggestion.id;
      }
      
      existingUuids.add(uuid);
      
      const newLine: LineData = {
        uuid: uuid,
        lineNumber: lineNumber,
        content: draftContent,
        originalAuthor: userId,
        editedBy: [],
        hasDraft: true
      };
      
      // Log the new line content in plain text before adding
      const newLinePlainText = getPlainTextFromDelta(newLine.content);
      logDraftLoading(`🔍 DEBUG: New line content plaintext: ${newLinePlainText}`);
      
      processedDraftLines.push(newLine);
      appliedSuggestionCount++;
      logDraftLoading(`🔍 DEBUG: Added new line with UUID ${uuid} at line number ${lineNumber}`);
    } else {
      logDraftLoading(`🔍 DEBUG: Could not apply suggestion - missing line_uuid, line_number, and line_number_draft`);
    }
  }
  
  logDraftLoading(`🔍 DEBUG: Applied a total of ${appliedSuggestionCount} suggestions`);
  
  return { 
    processedDraftLines, 
    appliedSuggestionCount 
  };
};
