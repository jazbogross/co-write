
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineDataProcessing';

/**
 * Fetches all lines for a specific script
 */
export const fetchAllLines = async (scriptId: string, isAdmin: boolean = false) => {
  try {
    // Select only necessary columns based on user role
    const columnSelection = isAdmin 
      ? 'id, line_number, line_number_draft, content, draft'
      : 'id, line_number, content';

    const { data, error } = await supabase
      .from('script_content')
      .select(columnSelection)
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (error) throw error;
    
    // Log the data for debugging
    console.log(`**** LineDataService **** Fetched ${data?.length || 0} lines from script_content`);
    if (data && data.length > 0) {
      // Log first few lines for debugging
      data.slice(0, 3).forEach((line, i) => {
        console.log(`**** LineDataService **** Line ${i+1} content:`, 
          typeof line.content === 'string' 
            ? line.content.substring(0, 30) + '...' 
            : 'Non-string content'
        );
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching line data:', error);
    throw error;
  }
};

/**
 * Check if user has any drafts in script_suggestions table
 */
export const checkForUserDrafts = async (scriptId: string, userId: string) => {
  try {
    const { count, error } = await supabase
      .from('script_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (error) throw error;
    console.log(`**** LineDataService **** Found ${count || 0} pending suggestions for user ${userId}`);
    return count && count > 0;
  } catch (error) {
    console.error('Error checking for user drafts:', error);
    return false;
  }
};

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
      // Admin users - load drafts from script_content
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
    } else {
      // Non-admin users - load drafts from script_suggestions
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
      suggestionDrafts.slice(0, 3).forEach((draft, i) => {
        console.log(`**** LineDataService **** Draft ${i+1}:`, {
          id: draft.id,
          line_uuid: draft.line_uuid,
          content: draft.content?.substring(0, 30) + '...',
          draft: draft.draft?.substring(0, 30) + '...',
          line_number: draft.line_number,
          line_number_draft: draft.line_number_draft
        });
      });
      
      // Create a merged dataset with both base content and suggestions
      const mergedLines = allLines.map((line: any) => {
        // Try to find a matching suggestion for this line
        const suggestion = suggestionDrafts?.find(s => s.line_uuid === line.id);
        
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
      
      // Also add any new lines from suggestions that don't have matching line_uuid
      const newLines = suggestionDrafts?.filter(s => 
        // Include suggestions without line_uuid or with line_uuid that doesn't match any existing line
        !s.line_uuid || !allLines.some((line: any) => line.id === s.line_uuid)
      ) || [];
      
      // Add new lines to the merged dataset
      newLines.forEach(newLine => {
        const highestLineNumber = Math.max(...mergedLines.map((l: any) => l.line_number || 0), 0);
        mergedLines.push({
          id: newLine.id, // Use suggestion ID as line ID for new lines
          content: '', // No original content for new lines
          draft: newLine.draft || newLine.content,
          line_number: highestLineNumber + 1,
          line_number_draft: newLine.line_number_draft || newLine.line_number || (highestLineNumber + 1)
        });
      });
      
      console.log(`**** LineDataService **** Processing ${mergedLines.length} merged lines, including ${newLines.length} new lines`);
      
      // Process the merged lines
      const updatedLines = processDraftLines(mergedLines, contentToUuidMapRef);
      console.log(`**** LineDataService **** Applied suggestion drafts to ${updatedLines.length} lines`);
      
      // Log the first few processed lines
      updatedLines.slice(0, 3).forEach((line, i) => {
        console.log(`**** LineDataService **** Processed line ${i+1}:`, {
          uuid: line.uuid,
          lineNumber: line.lineNumber,
          contentPreview: typeof line.content === 'string' 
            ? line.content.substring(0, 30) + '...' 
            : 'Delta object',
          hasDraft: line.hasDraft
        });
      });
      
      return updatedLines;
    }
  } catch (error) {
    console.error('**** LineDataService **** Error loading drafts:', error);
    throw error;
  }
};
