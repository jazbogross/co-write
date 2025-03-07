
import { LineData } from '@/hooks/useLineData';
import { normalizeContentForStorage } from './contentUtils';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

export interface ChangeRecord {
  type: 'modified' | 'added' | 'deleted';
  lineNumber: number;
  originalLineNumber?: number;
  content: string;
  uuid?: string;
}

/**
 * Detects changes between original content and edited line data
 */
export const trackChanges = (
  lineData: LineData[],
  originalContent: string,
  existingContentMap: Map<string, { uuid: string, lineNumber: number }>
): ChangeRecord[] => {
  const changes: ChangeRecord[] = [];
  const originalLines = originalContent.split('\n');
  
  // Find modified lines and added lines
  for (let i = 0; i < lineData.length; i++) {
    const currentLine = lineData[i];
    
    // Get plain text content for comparison if needed
    const currentContent = isDeltaObject(currentLine.content) 
      ? extractPlainTextFromDelta(currentLine.content)
      : currentLine.content as string;
    
    if (i < originalLines.length) {
      if (currentContent.trim() !== originalLines[i].trim()) {
        // Convert to proper format for storage
        const contentToStore = normalizeContentForStorage(currentLine.content);
          
        // Try to find existing UUID and line number for this content
        const existingData = existingContentMap.get(originalLines[i].trim());
        
        changes.push({
          type: 'modified',
          lineNumber: currentLine.lineNumber,
          originalLineNumber: existingData ? existingData.lineNumber : i + 1,
          content: contentToStore,
          uuid: existingData ? existingData.uuid : currentLine.uuid
        });
      }
    } else {
      // New line added
      const contentToStore = normalizeContentForStorage(currentLine.content);
        
      changes.push({
        type: 'added',
        lineNumber: currentLine.lineNumber,
        content: contentToStore,
        uuid: currentLine.uuid
      });
    }
  }
  
  return changes;
};

/**
 * Identify deleted lines by comparing current line UUIDs with existing content
 */
export const trackDeletedLines = (
  lineData: LineData[],
  existingContent: any[]
): ChangeRecord[] => {
  const deletedLines: ChangeRecord[] = [];
  
  if (!existingContent) return deletedLines;
  
  // Create a map of all line UUIDs currently in use
  const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
  
  for (const line of existingContent) {
    // If a line UUID from the database is not in our current line UUIDs, it was deleted
    if (!currentLineUUIDs.has(line.id)) {
      deletedLines.push({
        type: 'deleted',
        lineNumber: line.line_number,
        originalLineNumber: line.line_number,
        content: '', // Empty content for deletion
        uuid: line.id
      });
    }
  }
  
  return deletedLines;
};
