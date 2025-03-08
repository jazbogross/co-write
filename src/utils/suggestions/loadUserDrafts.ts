import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { logDeltaStructure, isDeltaObject, safelyParseDelta } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';
import { logDraftLineData, logDraftLoading } from './draftLoggingUtils';

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
    // First, get all original lines from script_content to map with suggestions
    const { data: originalLines, error: originalLinesError } = await supabase
      .from('script_content')
      .select('id, line_number, content')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (originalLinesError) {
      logDraftLoading('Error fetching original lines:', originalLinesError);
      return [];
    }
    
    if (!originalLines || originalLines.length === 0) {
      logDraftLoading('No original lines found for script:', scriptId);
      return [];
    }
    
    logDraftLoading(`Found ${originalLines.length} original lines`);
    
    // Next, get the user's suggestions for this script
    const { data: suggestions, error: suggestionsError } = await supabase
      .from('script_suggestions')
      .select('id, line_uuid, line_number, line_number_draft, content, draft')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (suggestionsError) {
      logDraftLoading('Error fetching suggestions:', suggestionsError);
      return [];
    }
    
    if (!suggestions || suggestions.length === 0) {
      logDraftLoading('No draft suggestions found for this script/user combination');
      return [];
    }
    
    logDraftLoading(`Found ${suggestions.length} draft suggestions`);
    
    // Process original lines to create initial LineData array
    const lineDataMap = new Map<string, LineData>();
    const uuidToLineNumberMap = new Map<string, number>();
    
    const initialLineData = originalLines.map((line: any, index: number) => {
      const uuid = line.id;
      const lineData: LineData = {
        uuid: uuid,
        lineNumber: line.line_number,
        content: line.content,
        originalAuthor: null,
        editedBy: [],
        hasDraft: false
      };
      
      // Add to maps for later lookup
      lineDataMap.set(uuid, lineData);
      uuidToLineNumberMap.set(uuid, line.line_number);
      
      // Store content to UUID mapping for later line tracking
      if (typeof line.content === 'string') {
        contentToUuidMapRef.current.set(line.content, uuid);
      }
      
      return lineData;
    });
    
    // Log initial line data
    logDraftLoading(`Created ${initialLineData.length} initial line data objects`);
    
    // Process suggestions and apply them to line data
    let appliedSuggestionCount = 0;
    let processedDraftLines: LineData[] = [...initialLineData];
    
    for (const suggestion of suggestions) {
      // Skip suggestions with null drafts or deleted drafts
      if (!suggestion.draft || suggestion.draft === '{deleted-uuid}') {
        continue;
      }
      
      // Try to find the line by UUID first (most accurate)
      if (suggestion.line_uuid && lineDataMap.has(suggestion.line_uuid)) {
        const lineData = lineDataMap.get(suggestion.line_uuid)!;
        
        // Update the line content with the draft
        lineData.content = suggestion.draft;
        lineData.hasDraft = true;
        
        // Update line number if provided
        if (suggestion.line_number_draft) {
          lineData.lineNumber = suggestion.line_number_draft;
        }
        
        appliedSuggestionCount++;
        logDraftLoading(`Applied draft to line UUID ${suggestion.line_uuid}, new line number: ${lineData.lineNumber}`);
        
        // Parse draft as Delta if it's a JSON object
        try {
          if (typeof suggestion.draft === 'string' && (
              suggestion.draft.startsWith('{') || 
              suggestion.draft.startsWith('[')
          )) {
            const parsedDraft = JSON.parse(suggestion.draft);
            if (isDeltaObject(parsedDraft)) {
              lineData.content = parsedDraft;
              logDraftLoading(`Parsed draft as Delta object for line UUID ${suggestion.line_uuid}`);
              logDeltaStructure(parsedDraft);
            }
          }
        } catch (e) {
          logDraftLoading(`Draft is not a valid JSON/Delta:`, e);
        }
      } 
      // If line_uuid lookup fails, try line_number
      else if (suggestion.line_number) {
        // Find the line with the matching line number
        const lineIndex = initialLineData.findIndex(line => line.lineNumber === suggestion.line_number);
        if (lineIndex >= 0) {
          const lineData = initialLineData[lineIndex];
          
          // Update the line content with the draft
          lineData.content = suggestion.draft;
          lineData.hasDraft = true;
          
          // Update line number if provided
          if (suggestion.line_number_draft) {
            lineData.lineNumber = suggestion.line_number_draft;
          }
          
          appliedSuggestionCount++;
          logDraftLoading(`Applied draft to line number ${suggestion.line_number}, new line number: ${lineData.lineNumber}`);
          
          // Parse draft as Delta if it's a JSON object
          try {
            if (typeof suggestion.draft === 'string' && (
                suggestion.draft.startsWith('{') || 
                suggestion.draft.startsWith('[')
            )) {
              const parsedDraft = JSON.parse(suggestion.draft);
              if (isDeltaObject(parsedDraft)) {
                lineData.content = parsedDraft;
                logDraftLoading(`Parsed draft as Delta object for line number ${suggestion.line_number}`);
                logDeltaStructure(parsedDraft);
              }
            }
          } catch (e) {
            logDraftLoading(`Draft is not a valid JSON/Delta:`, e);
          }
        } else {
          logDraftLoading(`Could not find line with number ${suggestion.line_number}`);
        }
      }
      // If this is a new line (no line_uuid or line_number)
      else if (suggestion.line_number_draft) {
        // Create a new line with the draft content
        const newUuid = suggestion.line_uuid || suggestion.id; // Use line_uuid if available, otherwise use suggestion id
        
        let draftContent: string | DeltaContent = suggestion.draft;
        
        // Parse draft as Delta if it's a JSON object
        try {
          if (typeof suggestion.draft === 'string' && (
              suggestion.draft.startsWith('{') || 
              suggestion.draft.startsWith('[')
          )) {
            const parsedDraft = JSON.parse(suggestion.draft);
            if (isDeltaObject(parsedDraft)) {
              draftContent = parsedDraft;
              logDraftLoading(`Parsed draft as Delta object for new line`);
              logDeltaStructure(parsedDraft);
            }
          }
        } catch (e) {
          logDraftLoading(`Draft is not a valid JSON/Delta:`, e);
        }
        
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
    
    // Sort processed lines by line number
    processedDraftLines.sort((a, b) => a.lineNumber - b.lineNumber);
    
    // Renumber lines to ensure sequential numbering
    processedDraftLines = processedDraftLines.map((line, index) => ({
      ...line,
      lineNumber: index + 1
    }));
    
    logDraftLoading(`Applied suggestion drafts to ${appliedSuggestionCount} lines`);
    logDraftLineData('Processed', processedDraftLines);
    
    return processedDraftLines;
  } catch (error) {
    logDraftLoading('Error loading user drafts:', error);
    return [];
  }
};
