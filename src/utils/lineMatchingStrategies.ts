
import { LineData } from '@/types/lineTypes';
import { v4 as uuidv4 } from 'uuid';
import { isDeltaObject, extractPlainTextFromDelta, isContentEmpty as editorIsContentEmpty } from '@/utils/editor';

export const isContentEmpty = editorIsContentEmpty;

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
    
    if (prevData[j].content === contentLineContent) {
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
  let contentForComparison = content;
  if (isDeltaObject(content)) {
    contentForComparison = extractPlainTextFromDelta(content);
  }
  
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
    let prevContent = prevData[j].content;
    if (isDeltaObject(prevContent)) {
      prevContent = extractPlainTextFromDelta(prevContent);
    }
    
    if (prevContent === contentForComparison) {
      match = { type: 'content', index: j };
      stats.preserved++;
      stats.matchStrategy['content'] = (stats.matchStrategy['content'] || 0) + 1;
      return { match, stats };
    }
  }
  
  return { match: null, stats };
};

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
  
  // Convert content to string for comparison if it's a Delta
  let contentForComparison = content;
  if (isDeltaObject(content)) {
    contentForComparison = extractPlainTextFromDelta(content);
  }
  
  let match = null;
  
  // First, try to match by position (line number)
  if (lineIndex < prevData.length && !usedIndices.has(lineIndex)) {
    // Check if content is similar or identical
    const prevLine = prevData[lineIndex];
    
    // Extract plain text from prevLine content if it's a Delta
    let prevLineContent = prevLine.content;
    if (isDeltaObject(prevLineContent)) {
      prevLineContent = extractPlainTextFromDelta(prevLineContent);
    } else if (typeof prevLineContent !== 'string') {
      prevLineContent = String(prevLineContent || '');
    }
    
    // Now compare using plain text on both sides
    if (prevLineContent === contentForComparison ||
        (!contentIsEmpty && typeof prevLineContent === 'string' && prevLineContent.includes(contentForComparison)) ||
        (!isContentEmpty(prevLineContent) && typeof contentForComparison === 'string' && contentForComparison.includes(prevLineContent))) {
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
