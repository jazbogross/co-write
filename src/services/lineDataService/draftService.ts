
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineProcessing';
import { fetchAllLines } from './fetchLineData';

/**
 * Loads user drafts from the database and returns processed line data
 */
export const loadDrafts = async (
  scriptId: string,
  userId: string | null,
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  isAdmin: boolean = true
): Promise<LineData[]> => {
  if (!scriptId || !userId) {
    console.log('**** LineDataService **** loadDrafts aborted: missing scriptId or userId');
    return [];
  }
  
  console.log('**** LineDataService **** Loading drafts for user:', userId, 'isAdmin:', isAdmin);
  
  try {
    // Get the base content first - needed for both admin and non-admin users
    const allLines = await fetchAllLines(scriptId, isAdmin);
    
    if (!allLines || allLines.length === 0) {
      console.log('**** LineDataService **** No base lines found for script:', scriptId);
      return [];
    }
    
    if (isAdmin) {
      return loadAdminDrafts(allLines, contentToUuidMapRef, isAdmin);
    } else {
      return loadNonAdminDrafts(scriptId, userId, allLines, contentToUuidMapRef, isAdmin);
    }
  } catch (error) {
    console.error('**** LineDataService **** Error loading drafts:', error);
    throw error;
  }
};

/**
 * Loads drafts for admin users from script_content table
 */
const loadAdminDrafts = async (
  allLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  isAdmin: boolean
): Promise<LineData[]> => {
  // Type-safe check if any lines have draft content
  const hasDrafts = Array.isArray(allLines) && allLines.some((line: any) => {
    // Safely check for draft property
    return line && 
           typeof line === 'object' && 
           'draft' in line && 
           line.draft !== null && 
           line.draft !== '{deleted-uuid}';
  });
  
  if (!hasDrafts) {
    console.log('**** LineDataService **** No drafts found for this script (admin)');
    // Process the base content anyway
    const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
    return processedLines;
  }
  
  // Process the lines with draft content - type safety assured by processLineData function
  const updatedLines = processDraftLines(allLines, contentToUuidMapRef);
  console.log(`**** LineDataService **** Applied draft updates to ${updatedLines.length} lines (admin)`);
  
  return updatedLines;
};

/**
 * Loads drafts for non-admin users from script_suggestions table
 */
const loadNonAdminDrafts = async (
  scriptId: string,
  userId: string,
  allLines: any[],
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  isAdmin: boolean
): Promise<LineData[]> => {
  console.log('**** LineDataService **** Loading non-admin drafts from script_suggestions');
  
  // Now fetch from script_suggestions for this user
  const { data: suggestionDrafts, error: draftError } = await supabase
    .from('script_suggestions')
    .select('*')
    .eq('script_id', scriptId)
    .eq('user_id', userId)
    .eq('status', 'pending');
  
  if (draftError) {
    console.error('**** LineDataService **** Error loading suggestion drafts:', draftError);
    // Return the base content processed
    const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
    return processedLines;
  }
  
  // Important debugging: log what was actually found in script_suggestions
  console.log(`**** LineDataService **** Found ${suggestionDrafts?.length || 0} suggestion drafts for user ${userId}`);
  
  if (!suggestionDrafts || suggestionDrafts.length === 0) {
    console.log('**** LineDataService **** No suggestion drafts found for this user, using base content');
    // Process and return the base content
    const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
    console.log(`**** LineDataService **** Processed ${processedLines.length} base content lines for non-admin`);
    return processedLines;
  }
  
  // Log the first few drafts for debugging
  logDraftDebuggingInfo(suggestionDrafts);
  
  // Create a merged dataset with both base content and suggestions
  const mergedLines = mergeLinesWithSuggestions(allLines, suggestionDrafts);
  
  console.log(`**** LineDataService **** Processing ${mergedLines.length} merged lines, including ${findNewLines(allLines, suggestionDrafts).length} new lines`);
  
  // Process the merged lines
  const updatedLines = processDraftLines(mergedLines, contentToUuidMapRef);
  console.log(`**** LineDataService **** Applied suggestion drafts to ${updatedLines.length} lines`);
  
  // Log the first few processed lines
  logProcessedLinesInfo(updatedLines);
  
  return updatedLines;
};

/**
 * Logs debug information about the first few drafts
 */
const logDraftDebuggingInfo = (suggestionDrafts: any[]) => {
  suggestionDrafts.slice(0, 3).forEach((draft: any, i) => {
    // Make sure 'draft' is an object before accessing properties
    if (draft && typeof draft === 'object') {
      // Safely access properties with optional chaining and type checking
      const contentPreview = typeof draft.content === 'string' 
        ? draft.content.substring(0, 30) + '...' 
        : 'Non-string content';
        
      const draftPreview = typeof draft.draft === 'string' 
        ? draft.draft.substring(0, 30) + '...' 
        : 'Non-string draft';
      
      console.log(`**** LineDataService **** Draft ${i+1}:`, {
        id: draft.id,
        line_uuid: draft.line_uuid,
        content: contentPreview,
        draft: draftPreview,
        line_number: draft.line_number,
        line_number_draft: draft.line_number_draft
      });
    } else {
      console.log(`**** LineDataService **** Draft ${i+1} is not a valid object`);
    }
  });
};

/**
 * Logs information about the first few processed lines
 */
const logProcessedLinesInfo = (updatedLines: LineData[]) => {
  updatedLines.slice(0, 3).forEach((line, i) => {
    // Type safety is guaranteed here since this is our own LineData type
    const contentPreview = typeof line.content === 'string' 
      ? line.content.substring(0, 30) + '...' 
      : 'Delta object';
      
    console.log(`**** LineDataService **** Processed line ${i+1}:`, {
      uuid: line.uuid,
      lineNumber: line.lineNumber,
      contentPreview: contentPreview,
      hasDraft: line.hasDraft
    });
  });
};

/**
 * Merge base lines with suggestion drafts
 */
const mergeLinesWithSuggestions = (allLines: any[], suggestionDrafts: any[]) => {
  // Convert base lines
  const mergedLines = allLines.map((line: any) => {
    // Make sure line is a valid object
    if (!line || typeof line !== 'object') {
      console.log('**** LineDataService **** Skipping invalid line object');
      return line;
    }
    
    // Try to find a matching suggestion for this line
    const suggestion = suggestionDrafts?.find((s: any) => 
      s && typeof s === 'object' && s.line_uuid === line.id
    );
    
    if (suggestion) {
      // Convert line to include suggestion data
      return {
        ...line,
        // If draft exists, use it, otherwise use the suggestion content
        draft: suggestion.draft || suggestion.content,
        line_number_draft: suggestion.line_number_draft || suggestion.line_number || line.line_number
      };
    }
    
    return line;
  });
  
  // Also add any new lines from suggestions
  const newLines = findNewLines(allLines, suggestionDrafts);
  
  // Add new lines to the merged dataset
  newLines.forEach((newLine: any) => {
    // Make sure newLine is a valid object
    if (!newLine || typeof newLine !== 'object') {
      console.log('**** LineDataService **** Skipping invalid new line object');
      return;
    }
    
    const highestLineNumber = Math.max(...mergedLines.map((l: any) => 
      l && typeof l === 'object' ? (l.line_number || 0) : 0
    ), 0);
    
    mergedLines.push({
      id: newLine.id, // Use suggestion ID as line ID for new lines
      content: '', // No original content for new lines
      draft: newLine.draft || newLine.content,
      line_number: highestLineNumber + 1,
      line_number_draft: newLine.line_number_draft || newLine.line_number || (highestLineNumber + 1)
    });
  });
  
  return mergedLines;
};

/**
 * Find new lines from suggestions that don't exist in the base content
 */
const findNewLines = (allLines: any[], suggestionDrafts: any[]) => {
  return suggestionDrafts?.filter((s: any) => 
    // Make sure s is a valid object first
    s && typeof s === 'object' && (
      // Include suggestions without line_uuid or with line_uuid that doesn't match any existing line
      !s.line_uuid || !allLines.some((line: any) => 
        line && typeof line === 'object' && line.id === s.line_uuid
      )
    )
  ) || [];
};
