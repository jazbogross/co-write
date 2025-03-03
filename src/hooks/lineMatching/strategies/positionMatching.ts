
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, getPlainTextContent } from '../contentUtils';
import { calculateTextSimilarity } from './textSimilarity';

/**
 * Find matches based on position in the document
 */
export const findPositionMatches = (
  plainTextContent: string,
  lineIndex: number,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  isEmptyLine: boolean
): { index: number; similarity: number; matchStrategy: string } | null => {
  const positionTolerance = 3; // Allow matching within +/- 3 lines
  const idealPosition = lineIndex; 
  
  for (let offset = 0; offset <= positionTolerance; offset++) {
    // Try matching at position +/- offset
    for (const pos of [idealPosition - offset, idealPosition + offset]) {
      if (pos >= 0 && pos < prevLineData.length && !excludeIndices.has(pos)) {
        // For position-based matching, use a lower similarity threshold
        const prevLineContent = getPlainTextContent(prevLineData[pos].content);
        const positionSimilarity = calculateTextSimilarity(plainTextContent, prevLineContent);
        
        // If it's reasonably similar or if both are empty lines, accept the position-based match
        if ((positionSimilarity > 0.3) || 
            (isEmptyLine && isContentEmpty(prevLineData[pos].content))) {
          return { 
            index: pos, 
            similarity: positionSimilarity, 
            matchStrategy: 'position-based' 
          };
        }
      }
    }
  }
  
  return null;
}
