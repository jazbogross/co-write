/**
 * LineSplitHandler.ts - Handles line split operations
 */

import { UuidValidator } from '../utils/UuidValidator';

export class LineSplitHandler {
  /**
   * Handle line splits - keep the UUID for the original line, generate new UUIDs for the newly created lines
   */
  public static handleLineSplit(quill: any, splitLineIndex: number, linePosition: any): void {
    console.log(`**** LineSplitHandler **** Handling line split at index ${splitLineIndex}`);
    
    const lines = quill.getLines(0);
    
    // The line at the split index should keep its original UUID (will be restored by UuidPreservation)
    // The new line created after the split should get a new UUID
    if (splitLineIndex >= 0 && splitLineIndex < lines.length - 1) {
      const newLineIndex = splitLineIndex + 1;
      const newLine = lines[newLineIndex];
      
      const newUuid = UuidValidator.assignNewUuid(newLine, newLineIndex);
      
      if (newUuid) {
        // Update our tracking maps with the new UUID
        linePosition.setLineUuid(newLineIndex + 1, newUuid, quill);
      }
    }
    
    // Update line indices for all lines
    linePosition.updateLineIndexAttributes(quill, false);
  }
}
