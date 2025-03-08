
import { LineData } from '@/types/lineTypes';
import { logDraftLoading, logDraftLineData } from './draftLoggingUtils';

/**
 * Finalizes line data after drafts are applied
 * Sorts by line number and ensures sequential numbering
 */
export const finalizeLineData = (
  processedDraftLines: LineData[],
  appliedSuggestionCount: number
): LineData[] => {
  // Sort processed lines by line number
  processedDraftLines.sort((a, b) => a.lineNumber - b.lineNumber);
  
  // Renumber lines to ensure sequential numbering
  const finalLineData = processedDraftLines.map((line, index) => ({
    ...line,
    lineNumber: index + 1
  }));
  
  logDraftLoading(`Applied suggestion drafts to ${appliedSuggestionCount} lines`);
  logDraftLineData('Processed', finalLineData);
  
  return finalLineData;
};
