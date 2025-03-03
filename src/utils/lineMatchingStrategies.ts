
import { LineData } from '@/types/lineTypes';
import { calculateTextSimilarity } from './lineMatching';

// Strategy 1: Handle Enter-at-position-0 operations
export const handleEnterAtZeroOperation = (
  emptyLineIndex: number,
  contentLineIndex: number,
  newContents: string[],
  prevData: LineData[],
  usedIndices: Set<number>,
  userId: string | null,
  quill: any
): {
  success: boolean;
  emptyLineData: LineData | null;
  contentLineData: LineData | null;
  stats: { preserved: number; regenerated: number; matchStrategy: Record<string, number> };
} => {
  const stats = {
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  };

  // Only proceed if both lines exist in the new content
  if (emptyLineIndex >= newContents.length || contentLineIndex >= newContents.length) {
    return { success: false, emptyLineData: null, contentLineData: null, stats };
  }

  const emptyLineContent = newContents[emptyLineIndex];
  const movedContent = newContents[contentLineIndex];
  const isEmpty = !emptyLineContent || !emptyLineContent.trim();
  
  const enterAtZeroOperation = quill?.lineTracking?.getLastOperation() || null;
  
  // Verify this is actually our operation by checking content patterns
  if (!isEmpty || movedContent !== enterAtZeroOperation?.movedContent) {
    return { success: false, emptyLineData: null, contentLineData: null, stats };
  }

  console.log(`**** lineMatchingStrategies **** Processing Enter-at-position-0 operation`);
  console.log(`**** lineMatchingStrategies **** Empty line at ${emptyLineIndex + 1}, moved content at ${contentLineIndex + 1}`);
  
  // 1. Generate new UUID for the empty line (emptyLineIndex)
  const emptyLineUuid = crypto.randomUUID();
  const emptyLineData = {
    uuid: emptyLineUuid,
    lineNumber: emptyLineIndex + 1,
    content: emptyLineContent,
    originalAuthor: userId,
    editedBy: []
  };
  
  if (quill?.lineTracking) {
    quill.lineTracking.setLineUuid(emptyLineIndex + 1, emptyLineUuid);
  }
  
  // Mark this index as processed
  usedIndices.add(emptyLineIndex);
  stats.regenerated++;
  stats.matchStrategy['enter-new-line'] = (stats.matchStrategy['enter-new-line'] || 0) + 1;
  
  // 2. Find the original line from previous data to preserve UUID for moved content
  let contentLineData = null;
  
  if (enterAtZeroOperation.lineIndex < prevData.length) {
    const originalLine = prevData[enterAtZeroOperation.lineIndex];
    
    contentLineData = {
      ...originalLine,
      lineNumber: contentLineIndex + 1,
      content: movedContent,
      editedBy: movedContent !== originalLine.content && userId && 
              !originalLine.editedBy.includes(userId)
        ? [...originalLine.editedBy, userId]
        : originalLine.editedBy
    };
    
    if (quill?.lineTracking) {
      quill.lineTracking.setLineUuid(contentLineIndex + 1, originalLine.uuid);
    }
    
    // Mark the original index as used
    usedIndices.add(enterAtZeroOperation.lineIndex);
    stats.preserved++;
    stats.matchStrategy['enter-moved-content'] = 
      (stats.matchStrategy['enter-moved-content'] || 0) + 1;
    
    console.log(`**** lineMatchingStrategies **** Enter-at-position-0 handled: new empty line UUID=${emptyLineUuid}, moved content UUID=${originalLine.uuid}`);
  }

  return { 
    success: true, 
    emptyLineData, 
    contentLineData, 
    stats 
  };
};

// Strategy 2: Match non-empty lines by content
export const matchNonEmptyLines = (
  content: string,
  lineIndex: number,
  prevData: LineData[],
  usedIndices: Set<number>,
  contentToUuidMap: Map<string, string>,
  domUuidMap: Map<number, string> | undefined
): {
  match: { index: number; similarity: number; matchStrategy: string } | null;
  stats: { preserved: number; regenerated: number; matchStrategy: Record<string, number> };
} => {
  const stats = {
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  };

  // Check for exact content match
  const exactContentIndex = prevData.findIndex(
    (line, idx) => line.content === content && !usedIndices.has(idx)
  );
  
  if (exactContentIndex >= 0) {
    const match = { index: exactContentIndex, similarity: 1, matchStrategy: 'exact-content' };
    stats.preserved++;
    stats.matchStrategy['exact-content'] = (stats.matchStrategy['exact-content'] || 0) + 1;
    return { match, stats };
  }
  
  // Check if we have this content in our content-to-UUID map
  const existingUuid = contentToUuidMap.get(content);
  if (existingUuid) {
    const exactMatchIndex = prevData.findIndex(line => line.uuid === existingUuid && !usedIndices.has(prevData.indexOf(line)));
    if (exactMatchIndex >= 0) {
      const match = { index: exactMatchIndex, similarity: 1, matchStrategy: 'content-uuid' };
      stats.preserved++;
      stats.matchStrategy['content-uuid'] = (stats.matchStrategy['content-uuid'] || 0) + 1;
      return { match, stats };
    }
  }
  
  // Look for lines with similar content
  let bestMatch = { index: -1, similarity: 0, matchStrategy: 'none' };
  
  // First check lines near the current position (most likely matches)
  const nearbyRange = 3; // Check 3 lines before and after
  const startIndex = Math.max(0, lineIndex - nearbyRange);
  const endIndex = Math.min(prevData.length - 1, lineIndex + nearbyRange);
  
  // Nearby lines check
  for (let i = startIndex; i <= endIndex; i++) {
    if (usedIndices.has(i)) continue;
    
    const similarity = calculateTextSimilarity(content, prevData[i].content);
    
    if (similarity > bestMatch.similarity && similarity >= 0.7) {
      bestMatch = { index: i, similarity, matchStrategy: 'nearby-similar' };
      
      // Early exit for very good matches
      if (similarity >= 0.9) {
        break;
      }
    }
  }
  
  if (bestMatch.index >= 0) {
    stats.preserved++;
    stats.matchStrategy[bestMatch.matchStrategy] = (stats.matchStrategy[bestMatch.matchStrategy] || 0) + 1;
    return { match: bestMatch, stats };
  }
  
  // No match found
  return { match: null, stats };
};

// Strategy 3: Match empty lines or lines with position-based fallback
export const matchWithPositionFallback = (
  content: string,
  lineIndex: number,
  prevData: LineData[],
  usedIndices: Set<number>,
  domUuidMap: Map<number, string> | undefined
): {
  match: { index: number; similarity: number; matchStrategy: string } | null;
  stats: { preserved: number; regenerated: number; matchStrategy: Record<string, number> };
} => {
  const stats = {
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  };

  const isEmpty = !content || !content.trim();

  // For empty lines, try to find an existing empty line
  if (isEmpty) {
    const emptyLineIndex = prevData.findIndex(
      (line, idx) => !line.content.trim() && !usedIndices.has(idx)
    );
    
    if (emptyLineIndex >= 0) {
      const match = { index: emptyLineIndex, similarity: 1, matchStrategy: 'empty-line-match' };
      stats.preserved++;
      stats.matchStrategy['empty-line-match'] = (stats.matchStrategy['empty-line-match'] || 0) + 1;
      return { match, stats };
    }
  }
  
  // Try UUID matching from DOM
  if (domUuidMap && domUuidMap.has(lineIndex)) {
    const uuid = domUuidMap.get(lineIndex);
    const uuidMatchIndex = prevData.findIndex(line => line.uuid === uuid && !usedIndices.has(prevData.indexOf(line)));
    
    if (uuidMatchIndex >= 0) {
      const match = { index: uuidMatchIndex, similarity: 0.95, matchStrategy: 'dom-uuid' };
      stats.preserved++;
      stats.matchStrategy['dom-uuid'] = (stats.matchStrategy['dom-uuid'] || 0) + 1;
      return { match, stats };
    }
  }
  
  // Last resort: Position-based fallback
  const positionTolerance = 3; 
  const idealPosition = lineIndex;
  
  for (let offset = 0; offset <= positionTolerance; offset++) {
    for (const pos of [idealPosition - offset, idealPosition + offset]) {
      if (pos >= 0 && pos < prevData.length && !usedIndices.has(pos)) {
        const positionSimilarity = calculateTextSimilarity(content, prevData[pos].content);
        
        if ((positionSimilarity > 0.3) || (isEmpty && !prevData[pos].content.trim())) {
          const match = { index: pos, similarity: positionSimilarity, matchStrategy: 'position-based' };
          stats.preserved++;
          stats.matchStrategy['position-based'] = (stats.matchStrategy['position-based'] || 0) + 1;
          return { match, stats };
        }
      }
    }
  }
  
  // No match found
  return { match: null, stats };
};
