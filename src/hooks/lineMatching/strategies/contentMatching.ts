
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, getPlainTextContent } from '../contentUtils';
import { calculateTextSimilarity } from './textSimilarity';

/**
 * Find exact content matches or similar content
 */
export const findContentMatches = (
  plainTextContent: string,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  lineIndex: number,
  contentToUuidMap?: Map<string, string>,
): { index: number; similarity: number; matchStrategy: string } | null => {
  // Skip empty content
  if (!plainTextContent.trim()) return null;
  
  // Strategy 1: Direct content equality (highest priority for non-empty lines)
  const exactContentIndex = prevLineData.findIndex(
    (line, idx) => {
      const lineContent = getPlainTextContent(line.content);
      return lineContent === plainTextContent && !excludeIndices.has(idx);
    }
  );
  
  if (exactContentIndex >= 0) {
    return { index: exactContentIndex, similarity: 1, matchStrategy: 'exact-content' };
  }
  
  // Strategy 2: Check for exact content match using contentToUuidMap
  if (contentToUuidMap && contentToUuidMap.has(plainTextContent)) {
    const existingUuid = contentToUuidMap.get(plainTextContent);
    const exactMatchIndex = prevLineData.findIndex(line => line.uuid === existingUuid);
    if (exactMatchIndex >= 0 && !excludeIndices.has(exactMatchIndex)) {
      return { index: exactMatchIndex, similarity: 1, matchStrategy: 'content-uuid' };
    }
  }
  
  // Strategy 3: Look for lines with similar content
  let bestMatch = { index: -1, similarity: 0, matchStrategy: 'none' };
  
  // First check lines near the current position (most likely matches)
  const nearbyRange = 3; // Check 3 lines before and after
  const startIndex = Math.max(0, lineIndex - nearbyRange);
  const endIndex = Math.min(prevLineData.length - 1, lineIndex + nearbyRange);
  
  // First pass - check nearby lines
  for (let i = startIndex; i <= endIndex; i++) {
    if (excludeIndices.has(i)) continue;
    
    const prevLineContent = getPlainTextContent(prevLineData[i].content);
    const similarity = calculateTextSimilarity(plainTextContent, prevLineContent);
    
    if (similarity > bestMatch.similarity && similarity >= 0.7) {
      bestMatch = { index: i, similarity, matchStrategy: 'nearby-similar' };
      
      // Early exit for very good matches
      if (similarity >= 0.9) {
        return bestMatch;
      }
    }
  }
  
  // Second pass - check all lines if we didn't find a good match nearby
  if (bestMatch.similarity < 0.7) {
    for (let i = 0; i < prevLineData.length; i++) {
      // Skip lines we already checked in the nearby pass
      if (excludeIndices.has(i) || (i >= startIndex && i <= endIndex)) continue;
      
      const prevLineContent = getPlainTextContent(prevLineData[i].content);
      const similarity = calculateTextSimilarity(plainTextContent, prevLineContent);
      
      if (similarity > bestMatch.similarity && similarity >= 0.6) {
        bestMatch = { index: i, similarity, matchStrategy: 'global-similar' };
        
        // Early exit for very good matches
        if (similarity >= 0.9) {
          break;
        }
      }
    }
  }
  
  if (bestMatch.index >= 0) {
    return bestMatch;
  }
  
  return null;
}
