
/**
 * LineTrackerEventHandler.ts - Handles event tracking for line changes
 */

import { LineTrackerState } from './LineTrackerTypes';

export class LineTrackerEventHandler {
  private quill: any;
  private linePosition: any;
  private cursorTracker: any;
  private uuidPreservation: any;
  private isTextChange: boolean = false;
  private lastLineCount: number = 0;
  
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
    
    // Initialize line count
    if (quill) {
      const lines = quill.getLines(0);
      this.lastLineCount = lines.length;
    }
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
    
    this.isTextChange = true;

    // Skip line tracking operations if it's a programmatic update
    if (!state.isProgrammaticUpdate) {
      // Check if this is a structural change (like line split or merge)
      const lines = this.quill.getLines(0);
      const currentLineCount = lines.length;
      const isStructuralChange = this.detectStructuralChange(delta) || 
                                 currentLineCount !== this.lastLineCount;
      
      if (isStructuralChange) {
        console.log('**** LineTrackerEventHandler **** Detected structural change, preserving UUIDs');
        
        // Save cursor position before structural changes
        this.cursorTracker.saveCursorPosition(this.quill);
        
        // Only preserve UUIDs for structural changes
        this.uuidPreservation.preserveLineUuids();

        // Analyze delta to detect line operations
        this.cursorTracker.analyzeTextChange(delta, this.quill);
        
        // Update line indices and track line count changes
        this.linePosition.updateLineIndexAttributes(this.quill, false);
        this.linePosition.detectLineCountChanges(this.quill, false);

        // Restore UUIDs after changes
        this.uuidPreservation.restoreLineUuids();
        
        // Make sure all lines have UUIDs
        this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
        
        // Restore cursor position after changes
        this.cursorTracker.restoreCursorPosition(this.quill);
        
        // Update line count
        this.lastLineCount = currentLineCount;
      }
      // For non-structural changes (normal typing), do nothing special
    } else {
      // Still update line indices during programmatic changes
      this.linePosition.updateLineIndexAttributes(this.quill, true);
    }
    
    this.isTextChange = false;
  }

  /**
   * Detect if the delta represents a structural change (line added/removed)
   */
  private detectStructuralChange(delta: any): boolean {
    if (!delta || !delta.ops) return false;
    
    // Look for newline insertions or deletions
    for (const op of delta.ops) {
      // Check for newline insertion
      if (op.insert && typeof op.insert === 'string' && op.insert.includes('\n')) {
        return true;
      }
      
      // Check for deletions that might span a newline
      if (op.delete && op.delete > 1) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Handle programmatic update mode
   */
  public handleProgrammaticUpdate(
    value: boolean,
    getLineUuid: (index: number) => string | undefined
  ): void {
    if (value) {
      // If turning on programmatic mode, preserve current UUIDs and cursor
      this.uuidPreservation.preserveLineUuids();
      this.cursorTracker.saveCursorPosition(this.quill);
    } else if (this.uuidPreservation.hasPreservedUuids()) {
      // When turning off, restore them
      this.uuidPreservation.restoreLineUuids();
      // Ensure all lines have UUIDs after programmatic updates
      this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
      
      // Restore cursor unless we're in a text change operation
      if (!this.isTextChange) {
        this.cursorTracker.restoreCursorPosition(this.quill);
      }
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
    
    // Update line count
    this.lastLineCount = lines.length;
  }
}
