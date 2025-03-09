
/**
 * LineTrackerEventHandler.ts - Handles event tracking for line changes
 */

import { LineTrackerState } from './LineTrackerTypes';

export class LineTrackerEventHandler {
  private quill: any;
  private linePosition: any;
  private cursorTracker: any;
  private uuidPreservation: any;
  
  constructor(
    quill: any,
    linePosition: any,
    cursorTracker: any,
    uuidPreservation: any
  ) {
    this.quill = quill;
    this.linePosition = linePosition;
    this.cursorTracker = cursorTracker;
    this.uuidPreservation = uuidPreservation;
  }

  /**
   * Handle cursor position changes
   */
  public handleSelectionChange(
    range: any,
    state: LineTrackerState
  ): void {
    if (state.isProgrammaticUpdate) return; // Skip tracking during programmatic updates
    this.cursorTracker.trackCursorChange(range, this.quill);
  }

  /**
   * Handle text changes
   */
  public handleTextChange(
    delta: any,
    oldDelta: any,
    source: string,
    state: LineTrackerState,
    getLineUuid: (index: number) => string | undefined
  ): void {
    // Skip if already updating
    if (state.isUpdating) {
      return;
    }

    // Skip line tracking operations if it's a programmatic update
    if (!state.isProgrammaticUpdate) {
      // Preserve UUIDs before changes
      this.uuidPreservation.preserveLineUuids();

      // Analyze delta to detect line operations, update line positions, etc.
      this.cursorTracker.analyzeTextChange(delta, this.quill);
      this.linePosition.updateLineIndexAttributes(this.quill, false);
      this.linePosition.detectLineCountChanges(this.quill, false);

      // Restore UUIDs after changes
      this.uuidPreservation.restoreLineUuids();
      
      // Make sure all lines have UUIDs
      this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
    } else {
      // Still update line indices during programmatic changes
      this.linePosition.updateLineIndexAttributes(this.quill, true);
    }
  }

  /**
   * Handle programmatic update mode
   */
  public handleProgrammaticUpdate(
    value: boolean,
    getLineUuid: (index: number) => string | undefined
  ): void {
    if (value) {
      // If turning on programmatic mode, preserve current UUIDs
      this.uuidPreservation.preserveLineUuids();
    } else if (this.uuidPreservation.hasPreservedUuids()) {
      // When turning off, restore them
      this.uuidPreservation.restoreLineUuids();
      // Ensure all lines have UUIDs after programmatic updates
      this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
    }
  }

  /**
   * Refresh line UUIDs from lineData
   */
  public refreshLineUuids(lineData: any[]): void {
    if (!lineData || lineData.length === 0) return;
    
    // Get lines from quill
    const lines = this.quill.getLines();
    
    // Map each line in the editor to the corresponding lineData by position
    for (let i = 0; i < Math.min(lines.length, lineData.length); i++) {
      const line = lines[i];
      const lineDataItem = lineData[i];
      
      if (line.domNode && lineDataItem && lineDataItem.uuid) {
        const currentUuid = line.domNode.getAttribute('data-line-uuid');
        const newUuid = lineDataItem.uuid;
        
        // Apply the UUID if it's different or missing
        if (currentUuid !== newUuid) {
          line.domNode.setAttribute('data-line-uuid', newUuid);
          line.domNode.setAttribute('data-line-index', String(i + 1));
        }
      }
    }
  }
}
