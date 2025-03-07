
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineProcessing';
import { logDraftDebuggingInfo, logProcessedLinesInfo } from './draftLoggingUtils';
import { mergeLinesWithSuggestions, findNewLines } from './draftMergeUtils';

/**
 * Loads drafts for non-admin users from script_suggestions table
 */
export const loadNonAdminDrafts = async (
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
