
/**
 * EnterAtZeroHandler.ts - Handles the special case of pressing Enter at position 0
 */

import { UuidValidator } from '../utils/UuidValidator';

export class EnterAtZeroHandler {
  /**
   * Handle special case: Enter at position 0
   * This creates a new blank line at the beginning
   */
  public static handleEnterAtZero(quill: any, linePosition: any): void {
    console.log(`**** EnterAtZeroHandler **** Handling Enter at position 0`);
    
    const lines = quill.getLines(0);
    
    // The first line should get a new UUID (the empty line)
    if (lines.length > 0 && lines[0].domNode) {
      const newUuid = UuidValidator.assignNewUuid(lines[0], 0);
      
      if (newUuid) {
        // Update our tracking maps with the new UUID
        linePosition.setLineUuid(1, newUuid, quill);
      }
    }
    
    // Update all line indices
    linePosition.updateLineIndexAttributes(quill, false);
  }
}
