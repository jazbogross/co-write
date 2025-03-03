
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, getPlainTextContent } from './contentUtils';

/**
 * Calculates text similarity between two strings
 * Uses a combination of exact match, prefix matching, and simple overlap detection
 */
export const calculateTextSimilarity = (a: string, b: string): number => {
  if (a === b) return 1;
  if (!a || !b) return 0;
  
  // For longer content, check for prefix matching
  if (a.length > 10 && b.length > 10) {
    // Check for common prefix
    let prefixLen = 0;
    const minLen = Math.min(a.length, b.length);
    while (prefixLen < minLen && a[prefixLen] === b[prefixLen]) {
      prefixLen++;
    }
    
    // If we have a substantial prefix match (at least 70% of the shorter string),
    // consider it a good match
    if (prefixLen >= minLen * 0.7) {
      return 0.9;
    }
    
    // If we have a decent prefix match, it's still a good signal
    if (prefixLen >= 10) {
      return 0.7 + (prefixLen / Math.max(a.length, b.length) * 0.3);
    }
  }
  
  // For shorter strings or if prefix matching fails, check for content overlap
  if (a.includes(b) || b.includes(a)) {
    const overlapScore = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.5 + (overlapScore * 0.4);
  }
  
  // Fall back to character-by-character comparison for very short strings
  let sameChars = 0;
  const maxLen = Math.max(a.length, b.length);
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    if (a[i] === b[i]) sameChars++;
  }
  
  return sameChars / maxLen;
};

/**
 * Finds best matching line across multiple strategies
 */
export const findBestMatchingLine = (
  content: string,
  lineIndex: number,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  contentToUuidMap?: Map<string, string>,
  positionBasedFallback: boolean = true,
  domUuidMap?: Map<number, string>
): { index: number; similarity: number; matchStrategy: string } | null => {
  // For empty lines that are newly created (at Enter press), 
  // we should always generate a new UUID
  const isEmptyLine = isContentEmpty(content);
  const isNewLine = isEmptyLine && (
    !prevLineData[lineIndex] || isContentEmpty(prevLineData[lineIndex]?.content)
  );
  
  if (isNewLine) {
    return null; // Force new UUID generation for new empty lines
  }
  
  if (!isEmptyLine) {
    // Strategy 1: Direct content equality (highest priority for non-empty lines)
    const exactContentIndex = prevLineData.findIndex(
      (line, idx) => {
        const lineContent = getPlainTextContent(line.content);
        return lineContent === content && !excludeIndices.has(idx);
      }
    );
    
    if (exactContentIndex >= 0) {
      return { index: exactContentIndex, similarity: 1, matchStrategy: 'exact-content' };
    }
    
    // Strategy 2: Check for exact content match using contentToUuidMap
    if (contentToUuidMap && contentToUuidMap.has(content)) {
      const existingUuid = contentToUuidMap.get(content);
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
      const similarity = calculateTextSimilarity(content, prevLineContent);
      
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
        const similarity = calculateTextSimilarity(content, prevLineContent);
        
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
  }

  // For empty lines, try to match existing empty lines
  if (isEmptyLine && !isNewLine) {
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
  }
  
  // For empty lines or if content matching failed, try DOM UUID matching
  if (domUuidMap && domUuidMap.has(lineIndex)) {
    const uuid = domUuidMap.get(lineIndex);
    const uuidMatchIndex = prevLineData.findIndex(line => line.uuid === uuid);
    
    if (uuidMatchIndex >= 0 && !excludeIndices.has(uuidMatchIndex)) {
      return { index: uuidMatchIndex, similarity: 0.95, matchStrategy: 'dom-uuid' };
    }
  }
  
  // Last resort: Position-based fallback - try to match lines at similar positions
  if (positionBasedFallback) {
    // Only apply position-based matching if the line count hasn't changed drastically
    const positionTolerance = 3; // Allow matching within +/- 3 lines
    const idealPosition = lineIndex; 
    
    for (let offset = 0; offset <= positionTolerance; offset++) {
      // Try matching at position +/- offset
      for (const pos of [idealPosition - offset, idealPosition + offset]) {
        if (pos >= 0 && pos < prevLineData.length && !excludeIndices.has(pos)) {
          // For position-based matching, use a lower similarity threshold
          const prevLineContent = getPlainTextContent(prevLineData[pos].content);
          const positionSimilarity = calculateTextSimilarity(content, prevLineContent);
          
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
  }
  
  return null;
};
