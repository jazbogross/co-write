
/**
 * LineTrackerEventHandler.ts - Handles event tracking for line changes
 */

import { LineTrackerState } from './LineTrackerTypes';

export class LineTrackerEventHandler {
  private quill: any;
  private linePosition: any;
  private cursorTracker: any;
  private uuidPreservation: any;
  private lastCursorPosition: any = null;
  private lastTextChangeTimestamp: number = 0;
  // Track if we're currently in a UUID operation to avoid recursive operations
  private isHandlingUuidOperation: boolean = false;
  
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
    
    // Store the cursor position for later restoration
    if (range) {
      this.lastCursorPosition = { 
        index: range.index, 
        length: range.length 
      };
    }
    
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
    if (state.isUpdating || this.isHandlingUuidOperation) {
      return;
    }

    // Skip line tracking operations if it's a programmatic update
    if (!state.isProgrammaticUpdate) {
      // Check if this delta contains line operations that would change line count
      const containsLineOperations = this.containsLineOperations(delta);
      const currentTime = Date.now();
      
      try {
        // Only preserve UUIDs if this change affects line structure
        if (containsLineOperations) {
          this.isHandlingUuidOperation = true;
          
          // Save current cursor position
          const currentSelection = this.quill.getSelection();
          if (currentSelection) {
            this.lastCursorPosition = { ...currentSelection };
          }
          
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
          
          // Restore cursor position after UUID operations
          if (this.lastCursorPosition) {
            setTimeout(() => {
              this.quill.setSelection(
                this.lastCursorPosition.index, 
                this.lastCursorPosition.length,
                'silent'
              );
            }, 0);
          }
        } else {
          // For simple text changes (no line operations), just track the cursor
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          
          // Update line attributes without UUID preservation for regular edits
          if (currentTime - this.lastTextChangeTimestamp > 500) {
            this.linePosition.updateLineIndexAttributes(this.quill, true);
          }
        }
        
        this.lastTextChangeTimestamp = currentTime;
      } finally {
        this.isHandlingUuidOperation = false;
      }
    } else {
      // Still update line indices during programmatic changes
      this.linePosition.updateLineIndexAttributes(this.quill, true);
    }
  }

  /**
   * Determine if a delta contains operations that would change line count
   */
  private containsLineOperations(delta: any): boolean {
    if (!delta || !delta.ops) return false;
    
    // Check for line-changing operations
    return delta.ops.some((op: any) => {
      // New line insertions
      if (op.insert && typeof op.insert === 'string' && op.insert.includes('\n')) {
        return true;
      }
      
      // Line deletions
      if (op.delete && op.delete > 10) { // Potentially deleting across lines
        return true;
      }
      
      // Check for paste operations that might include multiple lines
      if (op.insert && typeof op.insert === 'string' && op.insert.length > 30) {
        return true;
      }
      
      return false;
    });
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
