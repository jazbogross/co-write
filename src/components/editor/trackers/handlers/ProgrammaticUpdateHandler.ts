
/**
 * ProgrammaticUpdateHandler.ts - Handles programmatic update mode
 */

import { UuidValidator } from '../utils/UuidValidator';

export class ProgrammaticUpdateHandler {
  /**
   * Handle entering and exiting programmatic update mode
   */
  public static handleProgrammaticUpdate(
    value: boolean,
    uuidPreservation: any,
    cursorTracker: any, 
    quill: any,
    isTextChange: boolean,
    getLineUuid: (index: number) => string | undefined
  ): void {
    if (value) {
      // Entering programmatic update mode
      uuidPreservation.preserveLineUuids();
      cursorTracker.saveCursorPosition(quill);
    } else if (uuidPreservation.hasPreservedUuids()) {
      // Exiting programmatic update mode
      uuidPreservation.restoreLineUuids();
      uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
      
      UuidValidator.ensureUniqueUuids(quill.getLines(0));
      
      if (!isTextChange) {
        cursorTracker.restoreCursorPosition(quill);
      }
    }
  }
}
