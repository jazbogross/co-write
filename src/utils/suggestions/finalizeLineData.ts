
import { LineData } from '@/types/lineTypes';

/**
 * Finalize line data after applying drafts
 */
export const finalizeLineData = (
  processedDraftLines: LineData[],
  appliedSuggestionCount: number
): LineData[] => {
  // If no drafts were applied, return original lines
  if (appliedSuggestionCount === 0) {
    return processedDraftLines;
  }
  
  // Sort by line number
  const sortedLines = [...processedDraftLines].sort(
    (a, b) => a.lineNumber - b.lineNumber
  );
  
  // Ensure line numbers are sequential
  sortedLines.forEach((line, index) => {
    line.lineNumber = index + 1;
  });
  
  return sortedLines;
};
