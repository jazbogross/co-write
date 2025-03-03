
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, extractPlainTextForComparison, contentContains } from './contentUtils';

/**
 * Strategy for matching lines using position-based fallback
 */
export const matchWithPositionFallback = (
  content: any,
  lineIndex: number,
  prevData: LineData[],
  usedIndices: Set<number>,
  domUuidMap: Map<number, string>
) => {
  const stats = {
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  };
  
  // Handle content that could be a Delta object
  const contentIsEmpty = isContentEmpty(content);
  
  // Convert content to string for comparison
  let contentForComparison = extractPlainTextForComparison(content);
  
  let match = null;
  
  // First, try to match by position (line number)
  if (lineIndex < prevData.length && !usedIndices.has(lineIndex)) {
    // Check if content is similar or identical
    const prevLine = prevData[lineIndex];
    
    // Extract plain text from prevLine content
    let prevLineContent = extractPlainTextForComparison(prevLine.content);
    
    // Now compare using plain text on both sides
    if (prevLineContent === contentForComparison ||
        (!contentIsEmpty && contentContains(prevLineContent, contentForComparison)) ||
        (!isContentEmpty(prevLineContent) && contentContains(contentForComparison, prevLineContent))) {
      match = { type: 'position', index: lineIndex };
      stats.preserved++;
      stats.matchStrategy['position'] = (stats.matchStrategy['position'] || 0) + 1;
      return { match, stats };
    }
  }
  
  // Second, try to match by UUID in DOM attributes
  if (domUuidMap.has(lineIndex + 1)) {
    const uuid = domUuidMap.get(lineIndex + 1);
    const matchIndex = prevData.findIndex(line => line.uuid === uuid);
    
    if (matchIndex !== -1 && !usedIndices.has(matchIndex)) {
      match = { type: 'uuid-dom-fallback', index: matchIndex };
      stats.preserved++;
      stats.matchStrategy['uuid-dom-fallback'] = (stats.matchStrategy['uuid-dom-fallback'] || 0) + 1;
      return { match, stats };
    }
  }
  
  return { match: null, stats };
};
