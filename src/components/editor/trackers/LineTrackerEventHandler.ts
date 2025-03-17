
/**
 * LineTrackerEventHandler.ts - Handles event tracking for line changes
 * Refactored into smaller, focused components
 */

import { LineOperationType } from './utils/DeltaAnalyzer';
import { LineContentCache } from './utils/LineContentCache';
import { UuidValidator } from './utils/UuidValidator';
import { StructuralChangeAnalyzer } from './operations/StructuralChangeAnalyzer';
import { HandlerDispatcher } from './operations/HandlerDispatcher';
import { EventPreProcessor } from './operations/EventPreProcessor';
import { LineTrackerState } from './LineTrackerTypes';

export class LineTrackerEventHandler {
  private quill: any;
  private linePosition: any;
  private cursorTracker: any;
  private uuidPreservation: any;
  private isTextChange: boolean = false;
  private lastLineCount: number = 0;
  private contentCache: LineContentCache = new LineContentCache();
  private lastOperationType: string | null = null;
  private lastAffectedIndex: number = -1;

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
      // Cache initial line content for better change detection
      this.contentCache.cacheLineContents(lines);
    }
  }

  /**
   * Handle cursor position changes.
   */
  public handleSelectionChange(
    range: any,
    state: LineTrackerState
  ): void {
    if (state.isProgrammaticUpdate) return;
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
      
      // Determine if this change affects the document structure
      const isStructuralChange = StructuralChangeAnalyzer.needsStructuralHandling(
        delta, currentLineCount, this.lastLineCount
      );
      
      if (isStructuralChange) {
        console.log('**** LineTrackerEventHandler **** Detected structural change, handling line operations');
        
        // Prepare for changes (save cursor, preserve UUIDs)
        EventPreProcessor.prepareForChanges(
          this.cursorTracker, 
          this.uuidPreservation,
          this.quill
        );
        
        // Analyze the type of structural change
        const { operationType, affectedLineIndex } = StructuralChangeAnalyzer.analyzeChange(
          delta, 
          currentLineCount, 
          this.lastLineCount,
          this.quill
        );
        
        // Store last operation for debugging
        this.lastOperationType = operationType;
        this.lastAffectedIndex = affectedLineIndex;
        
        // Dispatch to appropriate handler
        HandlerDispatcher.dispatchOperation(
          operationType,
          affectedLineIndex,
          this.quill,
          this.linePosition,
          this.lastLineCount,
          this.contentCache
        );
        
        // Detect line count changes and update line indices
        this.linePosition.detectLineCountChanges(this.quill, false);
        
        // Finalize changes (restore UUIDs, cursor position)
        EventPreProcessor.finalizeChanges(
          this.uuidPreservation,
          getLineUuid,
          this.cursorTracker,
          this.quill,
          lines
        );
        
        // Update content cache for future change detection
        this.contentCache.cacheLineContents(this.quill.getLines(0));
        
        // Update the last known line count
        this.lastLineCount = currentLineCount;
      } else {
        // For non-structural changes, just analyze cursor position and update line indices
        this.cursorTracker.analyzeTextChange(delta, this.quill);
        this.linePosition.updateLineIndexAttributes(this.quill, false);
      }
    } else {
      this.linePosition.updateLineIndexAttributes(this.quill, true);
    }
    
    this.isTextChange = false;
  }

  /**
   * Handle programmatic update mode.
   */
  public handleProgrammaticUpdate(
    value: boolean,
    getLineUuid: (index: number) => string | undefined
  ): void {
    if (value) {
      this.uuidPreservation.preserveLineUuids();
      this.cursorTracker.saveCursorPosition(this.quill);
    } else if (this.uuidPreservation.hasPreservedUuids()) {
      this.uuidPreservation.restoreLineUuids();
      this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
      
      UuidValidator.ensureUniqueUuids(this.quill.getLines(0));
      
      if (!this.isTextChange) {
        this.cursorTracker.restoreCursorPosition(this.quill);
      }
    }
  }

  /**
   * Refresh line UUIDs from lineData.
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
    
    UuidValidator.ensureUniqueUuids(lines);
    
    this.contentCache.cacheLineContents(lines);
    this.lastLineCount = lines.length;
  }
  
  /**
   * Get the last detected operation (for debugging)
   */
  public getLastOperation(): { type: string | null, affectedIndex: number } {
    return {
      type: this.lastOperationType,
      affectedIndex: this.lastAffectedIndex
    };
  }
}
