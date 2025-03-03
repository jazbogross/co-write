
import { LineData } from '@/types/lineTypes';
import { isContentEmpty } from './contentUtils';
import { contentMatches } from './contentUtils';

/**
 * Handles the specific case of pressing Enter at the beginning of a line (position 0)
 */
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
  
  // Check if indices are valid
  if (emptyLineIndex < 0 || emptyLineIndex >= newContents.length ||
      contentLineIndex < 0 || contentLineIndex >= newContents.length) {
    console.log('**** handleEnterAtZeroOperation **** Invalid line indices');
    return { success: false, emptyLineData: null, contentLineData: null, stats };
  }
  
  // Check if lines are already processed
  if (usedIndices.has(emptyLineIndex) || usedIndices.has(contentLineIndex)) {
    console.log('**** handleEnterAtZeroOperation **** Lines already processed');
    return { success: false, emptyLineData: null, contentLineData: null, stats };
  }
  
  // Get content from the relevant lines
  const emptyLineContent = newContents[emptyLineIndex];
  const contentLineContent = newContents[contentLineIndex];
  
  // Check if the empty line is actually empty
  if (!isContentEmpty(emptyLineContent)) {
    console.log('**** handleEnterAtZeroOperation **** Empty line is not empty');
    return { success: false, emptyLineData: null, contentLineData: null, stats };
  }
  
  // Find a matching UUID for the content line
  let matchedContentLine = null;
  let matchedContentIndex = -1;
  
  for (let j = 0; j < prevData.length; j++) {
    if (usedIndices.has(j)) continue;
    
    if (contentMatches(prevData[j].content, contentLineContent)) {
      matchedContentLine = prevData[j];
      matchedContentIndex = j;
      break;
    }
  }
  
  if (!matchedContentLine) {
    console.log('**** handleEnterAtZeroOperation **** No matching content line found');
    stats.regenerated++;
  } else {
    stats.preserved++;
    usedIndices.add(matchedContentIndex);
  }
  
  // Create new LineData objects
  const newEmptyLineUuid = crypto.randomUUID();
  const newEmptyLineData: LineData = {
    uuid: newEmptyLineUuid,
    lineNumber: emptyLineIndex + 1,
    content: '',
    originalAuthor: userId,
    editedBy: []
  };
  
  const newContentLineData: LineData = matchedContentLine ? {
    ...matchedContentLine,
    lineNumber: contentLineIndex + 1,
    content: contentLineContent,
    editedBy: contentLineContent !== matchedContentLine.content && userId &&
             !matchedContentLine.editedBy.includes(userId)
      ? [...matchedContentLine.editedBy, userId]
      : matchedContentLine.editedBy
  } : {
    uuid: crypto.randomUUID(),
    lineNumber: contentLineIndex + 1,
    content: contentLineContent,
    originalAuthor: userId,
    editedBy: []
  };
  
  // Update line tracking if available
  if (quill && quill.lineTracking) {
    quill.lineTracking.setLineUuid(emptyLineIndex + 1, newEmptyLineUuid);
    quill.lineTracking.setLineUuid(contentLineIndex + 1, newContentLineData.uuid);
  }
  
  stats.matchStrategy['enterAtZero'] = (stats.matchStrategy['enterAtZero'] || 0) + 1;
  
  return {
    success: true,
    emptyLineData: newEmptyLineData,
    contentLineData: newContentLineData,
    stats
  };
};
