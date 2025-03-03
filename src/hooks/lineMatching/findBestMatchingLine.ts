
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, getPlainTextContent } from './contentUtils';
import { 
  findContentMatches,
  findEmptyLineMatches,
  findDomUuidMatches,
  findPositionMatches
} from './strategies';

/**
 * Finds best matching line across multiple strategies
 */
export const findBestMatchingLine = (
  content: any,
  lineIndex: number,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  contentToUuidMap?: Map<string, string>,
  positionBasedFallback: boolean = true,
  domUuidMap?: Map<number, string>
): { index: number; similarity: number; matchStrategy: string } | null => {
  // Convert to plain text for comparison
  const plainTextContent = getPlainTextContent(content);
  
  // For empty lines that are newly created (at Enter press), 
  // we should always generate a new UUID
  const isEmptyLine = isContentEmpty(plainTextContent);
  const isNewLine = isEmptyLine && (
    !prevLineData[lineIndex] || isContentEmpty(prevLineData[lineIndex]?.content)
  );
  
  if (isNewLine) {
    return null; // Force new UUID generation for new empty lines
  }
  
  if (!isEmptyLine) {
    // Try content-based strategies first (exact match, content-to-uuid, similarity)
    const contentMatch = findContentMatches(
      plainTextContent,
      prevLineData,
      excludeIndices,
      lineIndex,
      contentToUuidMap
    );
    
    if (contentMatch) {
      return contentMatch;
    }
  }

  // For empty lines, try to match existing empty lines
  if (isEmptyLine && !isNewLine) {
    const emptyLineMatch = findEmptyLineMatches(prevLineData, excludeIndices, isNewLine);
    if (emptyLineMatch) {
      return emptyLineMatch;
    }
  }
  
  // For empty lines or if content matching failed, try DOM UUID matching
  const domUuidMatch = findDomUuidMatches(lineIndex, prevLineData, excludeIndices, domUuidMap);
  if (domUuidMatch) {
    return domUuidMatch;
  }
  
  // Last resort: Position-based fallback - try to match lines at similar positions
  if (positionBasedFallback) {
    return findPositionMatches(
      plainTextContent,
      lineIndex,
      prevLineData,
      excludeIndices,
      isEmptyLine
    );
  }
  
  return null;
};
