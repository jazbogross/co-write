
/**
 * NewLineHandler.ts - Handles operations that create new lines
 */

import { UuidValidator } from '../utils/UuidValidator';
import { LineContentCache } from '../utils/LineContentCache';

export class NewLineHandler {
  /**
   * Handle new lines - generate new UUIDs for all newly added lines
   */
  public static handleNewLines(
    quill: any, 
    startLineIndex: number, 
    lastLineCount: number,
    linePosition: any,
    contentCache: LineContentCache
  ): void {
    console.log(`**** NewLineHandler **** Handling new lines starting at index ${startLineIndex}`);
    
    const lines = quill.getLines(0);
    
    // Identify new lines that need UUIDs
    for (let i = Math.max(0, startLineIndex); i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is likely a new line by comparing with our cached content
      const isNewLine = i >= lastLineCount || !contentCache.getCachedContent(i);
      const hasSameUuid = contentCache.checkForUuidDuplication(line, lines);
      
      if ((isNewLine || hasSameUuid) && line && line.domNode) {
        const newUuid = UuidValidator.assignNewUuid(line, i);
        
        if (newUuid) {
          // Update our tracking maps with the new UUID
          linePosition.setLineUuid(i + 1, newUuid, quill);
        }
      }
    }
    
    // Update line indices for all lines
    linePosition.updateLineIndexAttributes(quill, false);
  }
}
