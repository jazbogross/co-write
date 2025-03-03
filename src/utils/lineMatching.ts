
import { LineData } from '@/types/lineTypes';
import { 
  extractPlainTextFromDelta, 
  isDeltaObject 
} from '@/utils/editor';
import { 
  isContentEmpty, 
  getPlainTextContent, 
  getTrimmedContent,
  safeIncludes,
  safeTrim
} from '@/hooks/lineMatching/contentUtils';

/**
 * Calculate similarity between two text strings
 */
export function calculateTextSimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  
  // For longer texts, check for prefixes
  const minLength = Math.min(a.length, b.length);
  if (minLength > 5) {
    // Check for prefix match
    let prefixLength = 0;
    while (prefixLength < minLength && a[prefixLength] === b[prefixLength]) {
      prefixLength++;
    }
    
    if (prefixLength > minLength / 2) {
      return 0.8 + (prefixLength / minLength) * 0.2;
    }
  }
  
  // Check for content overlap
  if (a.includes(b) || b.includes(a)) {
    const overlapScore = Math.min(a.length, b.length) / Math.max(a.length, b.length);
    return 0.7 + overlapScore * 0.3;
  }
  
  // Character-by-character comparison for short strings
  let sameChars = 0;
  for (let i = 0; i < minLength; i++) {
    if (a[i] === b[i]) sameChars++;
  }
  
  return sameChars / Math.max(a.length, b.length);
}

/**
 * Find the best matching line based on content similarity
 */
export function findBestMatchingLine(
  content: any,
  lineIndex: number,
  prevData: LineData[],
  usedIndices: Set<number>,
  isDraft: boolean = false
): { index: number; similarity: number } | null {
  const plainTextContent = getPlainTextContent(content);
  const isEmpty = !safeTrim(plainTextContent);
  
  // For empty content, try to find an empty line at the same position
  if (isEmpty) {
    // Try to match empty lines at the exact same position
    if (lineIndex < prevData.length && !usedIndices.has(lineIndex)) {
      const prevLineContent = getPlainTextContent(prevData[lineIndex].content);
      if (!safeTrim(prevLineContent)) {
        return { index: lineIndex, similarity: 1 };
      }
    }
    
    // Find any unused empty line if exact position isn't available
    const emptyLineIndex = prevData.findIndex((line, idx) => 
      !usedIndices.has(idx) && !safeTrim(getPlainTextContent(line.content))
    );
    
    if (emptyLineIndex >= 0) {
      return { index: emptyLineIndex, similarity: 0.9 };
    }
    
    // If no empty lines found, try position-based matching with lower threshold
    return null;
  }
  
  // First try exact match
  const exactIndex = prevData.findIndex(
    (line, idx) => !usedIndices.has(idx) && getPlainTextContent(line.content) === plainTextContent
  );
  
  if (exactIndex >= 0) {
    return { index: exactIndex, similarity: 1 };
  }
  
  // Try similarity matching, prioritizing nearby lines
  const rangeToCheck = 5; // Check 5 lines before and after
  const startIndex = Math.max(0, lineIndex - rangeToCheck);
  const endIndex = Math.min(prevData.length - 1, lineIndex + rangeToCheck);
  
  let bestMatch = { index: -1, similarity: 0 };
  
  // Check nearby lines first
  for (let i = startIndex; i <= endIndex; i++) {
    if (usedIndices.has(i)) continue;
    
    const prevLineContent = getPlainTextContent(prevData[i].content);
    const similarity = calculateTextSimilarity(plainTextContent, prevLineContent);
    
    if (similarity > bestMatch.similarity && similarity > 0.7) {
      bestMatch = { index: i, similarity };
    }
  }
  
  // If no good match found nearby, try the rest
  if (bestMatch.similarity < 0.7) {
    for (let i = 0; i < prevData.length; i++) {
      // Skip already checked nearby lines
      if (usedIndices.has(i) || (i >= startIndex && i <= endIndex)) continue;
      
      const prevLineContent = getPlainTextContent(prevData[i].content);
      const similarity = calculateTextSimilarity(plainTextContent, prevLineContent);
      
      if (similarity > bestMatch.similarity && similarity > 0.5) {
        bestMatch = { index: i, similarity };
      }
    }
  }
  
  if (bestMatch.index >= 0) {
    return bestMatch;
  }
  
  // Position-based fallback with threshold
  const positionIndex = lineIndex < prevData.length ? lineIndex : prevData.length - 1;
  if (positionIndex >= 0 && !usedIndices.has(positionIndex)) {
    const prevLineContent = getPlainTextContent(prevData[positionIndex].content);
    const similarity = calculateTextSimilarity(plainTextContent, prevLineContent);
    
    // Lower threshold for position-based matching
    if (similarity > 0.3) {
      return { index: positionIndex, similarity };
    }
  }
  
  return null;
}

/**
 * Process and match lines between old and new content
 */
export function matchLines(
  newContents: any[],
  prevData: LineData[],
  userId: string | null = null
): { newData: LineData[], stats: any } {
  const usedIndices = new Set<number>();
  const newData: LineData[] = new Array(newContents.length);
  const stats = {
    preserved: 0,
    regenerated: 0,
    drafted: 0
  };
  
  // Handle non-empty lines first (they provide stronger signals)
  for (let i = 0; i < newContents.length; i++) {
    const content = newContents[i];
    if (isContentEmpty(content)) continue;
    
    const match = findBestMatchingLine(content, i, prevData, usedIndices);
    
    if (match) {
      const matchedLine = prevData[match.index];
      usedIndices.add(match.index);
      
      // Compare content to detect edits
      const hasChanged = getPlainTextContent(matchedLine.content) !== getPlainTextContent(content);
      
      newData[i] = {
        ...matchedLine,
        lineNumber: i + 1,
        content,
        editedBy: hasChanged && userId && !matchedLine.editedBy.includes(userId)
          ? [...matchedLine.editedBy, userId]
          : matchedLine.editedBy
      };
      
      stats.preserved++;
    }
  }
  
  // Now handle empty lines
  for (let i = 0; i < newContents.length; i++) {
    if (newData[i]) continue;
    
    const content = newContents[i];
    const match = findBestMatchingLine(content, i, prevData, usedIndices);
    
    if (match) {
      const matchedLine = prevData[match.index];
      usedIndices.add(match.index);
      
      // Compare content to detect edits
      const hasChanged = getPlainTextContent(matchedLine.content) !== getPlainTextContent(content);
      
      newData[i] = {
        ...matchedLine,
        lineNumber: i + 1,
        content,
        editedBy: hasChanged && userId && !matchedLine.editedBy.includes(userId)
          ? [...matchedLine.editedBy, userId]
          : matchedLine.editedBy
      };
      
      stats.preserved++;
    } else {
      // Generate new UUID for unmatched lines
      const newUuid = crypto.randomUUID();
      
      newData[i] = {
        uuid: newUuid,
        lineNumber: i + 1,
        content,
        originalAuthor: userId,
        editedBy: []
      };
      
      stats.regenerated++;
    }
  }
  
  return { newData, stats };
}

