
import { LineData } from '@/types/lineTypes';
import { isContentEmpty, getPlainTextContent } from './contentUtils';
import { findBestMatchingLine } from './findBestMatchingLine';
import { recordStrategyUsage } from './statsUtils';

/**
 * Match non-empty lines with content-based strategies
 */
export const matchNonEmptyLines = (
  safeNewContents: any[],
  prevData: LineData[],
  usedIndices: Set<number>,
  newData: LineData[],
  contentToUuidMap: Map<string, string>,
  domUuidMap: Map<number, string>,
  quill: any,
  stats: any,
  userId: string | null
) => {
  for (let i = 0; i < safeNewContents.length; i++) {
    // Skip lines already handled
    if (newData[i]) continue;
    
    const content = safeNewContents[i];
    // Get plain text for empty check
    const plainTextContent = getPlainTextContent(content);
    
    // Skip empty lines in this pass
    if (isContentEmpty(plainTextContent)) continue;
    
    const match = findBestMatchingLine(
      content,
      i,
      prevData,
      usedIndices,
      contentToUuidMap,
      false, // Don't use position fallback yet
      domUuidMap
    );
    
    if (match) {
      const matchIndex = match.index;
      usedIndices.add(matchIndex);
      
      const existingLine = prevData[matchIndex];
      newData[i] = {
        ...existingLine,
        lineNumber: i + 1,
        content,
        editedBy: plainTextContent !== getPlainTextContent(existingLine.content) && userId && 
                 !existingLine.editedBy.includes(userId)
          ? [...existingLine.editedBy, userId]
          : existingLine.editedBy
      };
      
      // Update content-to-UUID mapping
      contentToUuidMap.set(plainTextContent, existingLine.uuid);
      
      if (quill && quill.lineTracking) {
        quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
      }
      
      // Update statistics
      stats.preserved++;
      recordStrategyUsage(stats, match.matchStrategy);
    }
  }
};

/**
 * Match remaining lines (empty lines and unmatched content)
 */
export const matchRemainingLines = (
  safeNewContents: any[],
  prevData: LineData[],
  usedIndices: Set<number>,
  newData: LineData[],
  contentToUuidMap: Map<string, string>,
  domUuidMap: Map<number, string>,
  quill: any,
  stats: any,
  userId: string | null
) => {
  for (let i = 0; i < safeNewContents.length; i++) {
    if (newData[i]) continue;
    
    const content = safeNewContents[i];
    const plainTextContent = getPlainTextContent(content);
    const isEmpty = isContentEmpty(plainTextContent);
    
    try {
      // For unmatched lines, try more aggressive matching strategies
      const match = findBestMatchingLine(
        content,
        i,
        prevData,
        usedIndices,
        undefined, // Don't use contentToUuidMap in this pass
        true, // Enable position-based fallback
        domUuidMap
      );
      
      if (match) {
        const matchIndex = match.index;
        usedIndices.add(matchIndex);
        
        const existingLine = prevData[matchIndex];
        newData[i] = {
          ...existingLine,
          lineNumber: i + 1,
          content,
          editedBy: plainTextContent !== getPlainTextContent(existingLine.content) && userId && 
                   !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        };
        
        if (!isEmpty) {
          contentToUuidMap.set(plainTextContent, existingLine.uuid);
        }
        
        if (quill && quill.lineTracking) {
          quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
        }
        
        // Update statistics
        stats.preserved++;
        recordStrategyUsage(stats, match.matchStrategy);
      } else {
        // Generate new UUID for unmatched lines
        stats.regenerated++;
        const newUuid = crypto.randomUUID();
        newData[i] = {
          uuid: newUuid,
          lineNumber: i + 1,
          content,
          originalAuthor: userId,
          editedBy: []
        };
        
        if (!isEmpty) {
          contentToUuidMap.set(plainTextContent, newUuid);
        }
        
        if (quill?.lineTracking) {
          quill.lineTracking.setLineUuid(i + 1, newUuid);
        }
        
        recordStrategyUsage(stats, 'new-generation');
      }
    } catch (error) {
      console.error('Error in line matching:', error);
      
      // Fallback: Generate new UUID for lines that caused errors
      stats.regenerated++;
      const newUuid = crypto.randomUUID();
      newData[i] = {
        uuid: newUuid,
        lineNumber: i + 1,
        content: typeof content === 'string' ? content : '',
        originalAuthor: userId,
        editedBy: []
      };
      
      if (quill?.lineTracking) {
        quill.lineTracking.setLineUuid(i + 1, newUuid);
      }
      
      recordStrategyUsage(stats, 'error-fallback');
    }
  }
};

