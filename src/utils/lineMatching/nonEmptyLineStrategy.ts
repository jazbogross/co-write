
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, extractPlainTextForComparison } from './contentUtils';
import { isDeltaObject } from '../editor';

/**
 * Strategy for matching non-empty lines with content matching
 */
export const matchNonEmptyLines = (
  content: any,
  lineIndex: number,
  prevData: LineData[],
  usedIndices: Set<number>,
  contentToUuidMap: Map<string, string>,
  domUuidMap: Map<number, string>
) => {
  const stats = {
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  };
  
  // Handle content that could be a Delta object
  const contentIsEmpty = isContentEmpty(content);
  
  // Skip empty lines
  if (contentIsEmpty) {
    return { match: null, stats };
  }
  
  // Convert content to string for comparison if it's a Delta
  let contentForComparison = extractPlainTextForComparison(content);
  
  let match = null;
  
  // First, try to match by UUID in DOM attributes
  if (domUuidMap.has(lineIndex + 1)) {
    const uuid = domUuidMap.get(lineIndex + 1);
    const matchIndex = prevData.findIndex(line => line.uuid === uuid);
    
    if (matchIndex !== -1 && !usedIndices.has(matchIndex)) {
      match = { type: 'uuid-dom', index: matchIndex };
      stats.preserved++;
      stats.matchStrategy['uuid-dom'] = (stats.matchStrategy['uuid-dom'] || 0) + 1;
      return { match, stats };
    }
  }
  
  // Second, try to match by exact content
  for (let j = 0; j < prevData.length; j++) {
    if (usedIndices.has(j)) continue;
    
    // Extract plain text from prevData content if it's a Delta
    let prevContent = extractPlainTextForComparison(prevData[j].content);
    
    if (prevContent === contentForComparison) {
      match = { type: 'content', index: j };
      stats.preserved++;
      stats.matchStrategy['content'] = (stats.matchStrategy['content'] || 0) + 1;
      return { match, stats };
    }
  }
  
  return { match: null, stats };
};
