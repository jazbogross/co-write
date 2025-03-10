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
  
  // Define operation types for structural changes
  private operationTypes = {
    SPLIT: 'split',
    NEW: 'new',
    MERGE: 'merge',
    MODIFY: 'modify'
  };

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
    
    // Initialize the last line count from the editor
    if (quill) {
      const lines = quill.getLines(0);
      this.lastLineCount = lines.length;
    }
  }

  /**
   * Handle cursor position changes.
   */
  public handleSelectionChange(
    range: any,
    state: LineTrackerState
  ): void {
    if (state.isProgrammaticUpdate) return; // Skip tracking during programmatic updates
    this.cursorTracker.trackCursorChange(range, this.quill);
  }

  /**
   * Handle text changes.
   */
  public handleTextChange(
    delta: any,
    oldDelta: any,
    source: string,
    state: LineTrackerState,
    getLineUuid: (index: number) => string | undefined
  ): void {
    if (state.isUpdating) return;
    
    this.isTextChange = true;

    if (!state.isProgrammaticUpdate) {
      const lines = this.quill.getLines(0);
      const currentLineCount = lines.length;
      const isStructuralChange = this.detectStructuralChange(delta) || 
                                 currentLineCount !== this.lastLineCount;
      
      if (isStructuralChange) {
        console.log('**** LineTrackerEventHandler **** Detected structural change, handling line operations');
        
        // Save cursor position before making changes
        this.cursorTracker.saveCursorPosition(this.quill);
        
        // Determine the type of structural change
        const operationType = this.analyzeStructuralChange(delta, currentLineCount);
        console.log(`**** LineTrackerEventHandler **** Operation type detected: ${operationType}`);
        
        if (operationType === this.operationTypes.SPLIT || operationType === this.operationTypes.NEW) {
          console.log(`**** LineTrackerEventHandler **** Handling ${operationType} operation`);
          
          // Preserve UUIDs only for existing lines
          this.uuidPreservation.preserveLineUuids();
          
          // Analyze the delta for additional line operations
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          
          // Update line indices and detect changes in line count
          this.linePosition.updateLineIndexAttributes(this.quill, false);
          this.linePosition.detectLineCountChanges(this.quill, false);
          
          // Restore UUIDs for existing lines
          this.uuidPreservation.restoreLineUuids();
          
          // For newly inserted lines, assign new UUIDs
          if (currentLineCount > this.lastLineCount) {
            this.assignNewUuidsToNewLines(this.quill.getLines(0), this.lastLineCount, currentLineCount);
          }
        } else if (operationType === this.operationTypes.MERGE) {
          // For merges, preserve and then restore UUIDs normally
          this.uuidPreservation.preserveLineUuids();
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
          this.linePosition.detectLineCountChanges(this.quill, false);
          this.uuidPreservation.restoreLineUuids();
        } else {
          // For modifications, standard handling
          this.uuidPreservation.preserveLineUuids();
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
          this.linePosition.detectLineCountChanges(this.quill, false);
          this.uuidPreservation.restoreLineUuids();
        }
        
        // Ensure that every line has a UUID (generate if missing)
        this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
        
        // Restore cursor position after changes
        this.cursorTracker.restoreCursorPosition(this.quill);
        
        // Update the last known line count
        this.lastLineCount = currentLineCount;
      }
    } else {
      // For programmatic changes, simply update line indices
      this.linePosition.updateLineIndexAttributes(this.quill, true);
    }
    
    this.isTextChange = false;
  }

  /**
   * Detect if the delta represents a structural change (i.e. line added or removed).
   */
  private detectStructuralChange(delta: any): boolean {
    if (!delta || !delta.ops) return false;
    
    for (const op of delta.ops) {
      if (op.insert && typeof op.insert === 'string' && op.insert.includes('\n')) {
        return true;
      }
      if (op.delete && op.delete > 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Analyze the type of structural change.
   * Returns one of the operationTypes: SPLIT, NEW, MERGE, or MODIFY.
   */
  private analyzeStructuralChange(delta: any, currentLineCount: number): string {
    if (!delta || !delta.ops) return this.operationTypes.MODIFY;
    
    if (currentLineCount > this.lastLineCount) {
      // If line count increased, check delta operations for newline inserts.
      for (const op of delta.ops) {
        if (op.insert && typeof op.insert === 'string') {
          if (op.insert === '\n') {
            return this.operationTypes.SPLIT;
          } else if (op.insert.includes('\n')) {
            return this.operationTypes.NEW;
          }
        }
      }
      return this.operationTypes.NEW;
    }
    
    if (currentLineCount < this.lastLineCount) {
      return this.operationTypes.MERGE;
    }
    
    return this.operationTypes.MODIFY;
  }

  /**
   * Assign new UUIDs to newly created lines.
   * This method updates the DOM attributes for lines from startIndex (lastLineCount) to endCount.
   */
  private assignNewUuidsToNewLines(lines: any[], startIndex: number, endCount: number): void {
    console.log(`**** LineTrackerEventHandler **** Assigning new UUIDs to lines ${startIndex + 1} to ${endCount}`);
    for (let i = startIndex; i < endCount; i++) {
      if (i < lines.length && lines[i].domNode) {
        const newUuid = crypto.randomUUID();
        lines[i].domNode.setAttribute('data-line-uuid', newUuid);
        lines[i].domNode.setAttribute('data-line-index', String(i + 1));
        console.log(`**** LineTrackerEventHandler **** Assigned new UUID ${newUuid} to line ${i + 1}`);
      }
    }
  }

  /**
   * Handle programmatic update mode.
   */
  public handleProgrammaticUpdate(
    value: boolean,
    getLineUuid: (index: number) => string | undefined
  ): void {
    if (value) {
      // When enabling programmatic updates, preserve UUIDs and save cursor position.
      this.uuidPreservation.preserveLineUuids();
      this.cursorTracker.saveCursorPosition(this.quill);
    } else if (this.uuidPreservation.hasPreservedUuids()) {
      // When disabling, restore UUIDs and ensure all lines have them.
      this.uuidPreservation.restoreLineUuids();
      this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
      if (!this.isTextChange) {
        this.cursorTracker.restoreCursorPosition(this.quill);
      }
    }
  }

  /**
   * Refresh line UUIDs from lineData.
   * 
   * Enhancements:
   * 1. If a new line is detected in the editor (i.e. there's no corresponding entry in lineData), 
   *    create a new lineData item and generate a new UUID.
   * 2. If an existing lineData item is missing a UUID, generate one.
   * 3. Retain UUIDs for lines that already have one.
   * 4. Update the DOM with the correct data-line-uuid and data-line-index attributes.
   */
  public refreshLineUuids(lineData: any[]): void {
    if (!lineData || lineData.length === 0) return;
    
    const lines = this.quill.getLines(0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i >= lineData.length || !lineData[i]) {
        const newUuid = crypto.randomUUID();
        const newLineDataItem = { uuid: newUuid, lineNumber: i + 1 };
        lineData[i] = newLineDataItem;
        console.log(`LineTrackerEventHandler - New line inserted at position ${i + 1} assigned UUID: ${newUuid}`);
      } else if (!lineData[i].uuid) {
        const newUuid = crypto.randomUUID();
        lineData[i].uuid = newUuid;
        console.log(`LineTrackerEventHandler - Assigned new UUID for line ${i + 1}: ${newUuid}`);
      }
      
      if (line.domNode) {
        const currentUuid = line.domNode.getAttribute('data-line-uuid');
        const newUuid = lineData[i].uuid;
        if (currentUuid !== newUuid) {
          line.domNode.setAttribute('data-line-uuid', newUuid);
          line.domNode.setAttribute('data-line-index', String(i + 1));
        }
      }
    }
    
    this.lastLineCount = lines.length;
  }
}
