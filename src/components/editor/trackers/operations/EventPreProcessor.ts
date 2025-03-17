
/**
 * EventPreProcessor.ts - Pre-processing for text change events
 */

export class EventPreProcessor {
  /**
   * Save cursor and preserve UUIDs before making changes
   */
  public static prepareForChanges(
    cursorTracker: any,
    uuidPreservation: any,
    quill: any
  ): void {
    // Save cursor position before making changes
    cursorTracker.saveCursorPosition(quill);
    
    // Preserve existing UUIDs before any DOM manipulations
    uuidPreservation.preserveLineUuids();
  }
  
  /**
   * Finalize changes by restoring UUIDs and cursor position
   */
  public static finalizeChanges(
    uuidPreservation: any,
    getLineUuid: (index: number) => string | undefined,
    cursorTracker: any,
    quill: any,
    lines: any[]
  ): void {
    // Restore UUIDs for existing lines
    uuidPreservation.restoreLineUuids();
    
    // Ensure that every line has a UUID (generate if missing)
    uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
    
    // Final check: Make sure all lines have different UUIDs
    if (lines && lines.length > 0) {
      const UuidValidator = require('../utils/UuidValidator').UuidValidator;
      UuidValidator.ensureUniqueUuids(lines);
    }
    
    // Restore cursor position after changes
    cursorTracker.restoreCursorPosition(quill);
  }
}
