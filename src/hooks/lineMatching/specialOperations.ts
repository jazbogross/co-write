
import { LineData } from '@/types/lineTypes';
import { generateStatsTemplate } from './statsUtils';
import { isContentEmpty } from './contentUtils';

/**
 * Handle special operation: Enter at position 0
 * This happens when the user presses Enter at the beginning of a line,
 * which creates a new empty line above and moves the content down
 */
export const handleSpecialOperations = (
  enterAtZeroOperation: any,
  safeNewContents: string[],
  prevData: LineData[],
  usedIndices: Set<number>,
  userId: string | null,
  quill: any
) => {
  // Prepare return template
  const result = {
    success: false,
    emptyLineIndex: 0,
    contentLineIndex: 0,
    emptyLineData: null as LineData | null,
    contentLineData: null as LineData | null,
    stats: generateStatsTemplate()
  };
  
  const emptyLineIndex = enterAtZeroOperation.lineIndex;
  const contentLineIndex = emptyLineIndex + 1;
  
  if (contentLineIndex >= safeNewContents.length) {
    // Invalid operation, content line doesn't exist
    return result;
  }
  
  // Make sure this is a valid enter-at-0 operation:
  // 1. First line should be empty
  // 2. Second line should contain the moved content
  const isFirstLineEmpty = isContentEmpty(safeNewContents[emptyLineIndex]);
  
  // Moved content can be slightly different due to formatting changes
  const movedContent = enterAtZeroOperation.movedContent;
  const contentSimilar = safeNewContents[contentLineIndex].includes(movedContent) ||
                          movedContent.includes(safeNewContents[contentLineIndex]);
  
  if (!isFirstLineEmpty || !contentSimilar) {
    return result;
  }
  
  // Find the original line in previous data
  const originalLine = prevData.find(line => {
    const lineContent = typeof line.content === 'string' ? line.content : '';
    return lineContent.includes(movedContent) || movedContent.includes(lineContent);
  });
  
  if (!originalLine) {
    return result;
  }
  
  // Create a new UUID for the empty line
  const emptyLineUuid = crypto.randomUUID();
  
  // Mark the original line as used
  const originalIndex = prevData.findIndex(line => line.uuid === originalLine.uuid);
  if (originalIndex >= 0) {
    usedIndices.add(originalIndex);
  }
  
  // Create data for the empty line
  result.emptyLineData = {
    uuid: emptyLineUuid,
    lineNumber: emptyLineIndex + 1,
    content: '',
    originalAuthor: userId,
    editedBy: []
  };
  
  // Create data for the content line (preserving UUID)
  result.contentLineData = {
    ...originalLine,
    lineNumber: contentLineIndex + 1,
    content: safeNewContents[contentLineIndex],
    editedBy: originalLine.content !== safeNewContents[contentLineIndex] && userId && 
             !originalLine.editedBy.includes(userId)
      ? [...originalLine.editedBy, userId]
      : originalLine.editedBy
  };
  
  // Set the UUIDs in editor DOM
  if (quill?.lineTracking) {
    quill.lineTracking.setLineUuid(emptyLineIndex + 1, emptyLineUuid);
    quill.lineTracking.setLineUuid(contentLineIndex + 1, originalLine.uuid);
  }
  
  // Update statistics
  result.stats.preserved = 1;
  result.stats.regenerated = 1;
  result.stats.matchStrategy['enter-at-zero'] = 1;
  
  // Update indices for the caller
  result.emptyLineIndex = emptyLineIndex;
  result.contentLineIndex = contentLineIndex;
  result.success = true;
  
  return result;
};
