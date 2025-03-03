
import { LineData } from '@/types/lineTypes';
import { isContentEmpty } from '../contentUtils';

/**
 * Find matches for empty lines
 */
export const findEmptyLineMatches = (
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  isNewLine: boolean
): { index: number; similarity: number; matchStrategy: string } | null => {
  // For new empty lines, always generate a new UUID
  if (isNewLine) {
    return null;
  }
  
  // Try to find an existing empty line that hasn't been matched
  const emptyLineIndex = prevLineData.findIndex(
    (line, idx) => isContentEmpty(line.content) && !excludeIndices.has(idx)
  );
  
  if (emptyLineIndex >= 0) {
    return { 
      index: emptyLineIndex, 
      similarity: 1, 
      matchStrategy: 'empty-line-match' 
    };
  }
  
  return null;
}
