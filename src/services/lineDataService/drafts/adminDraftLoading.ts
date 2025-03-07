
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineProcessing';

/**
 * Loads drafts for admin users from script_content table
 */
export const loadAdminDrafts = async (
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
