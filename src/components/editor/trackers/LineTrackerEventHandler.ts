
/**
 * LineTrackerEventHandler.ts - Handles event tracking for line changes
 * Refactored into smaller, focused components
 */

import { LineOperationType, DeltaAnalyzer } from './utils/DeltaAnalyzer';
import { LineContentCache } from './utils/LineContentCache';
import { UuidValidator } from './utils/UuidValidator';
import { LineSplitHandler } from './handlers/LineSplitHandler';
import { NewLineHandler } from './handlers/NewLineHandler';
import { EnterAtZeroHandler } from './handlers/EnterAtZeroHandler';
import { DeleteMergeHandler } from './handlers/DeleteMergeHandler';
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
  private preventUuidRegenerationOnDelete: boolean = true;

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
      const isStructuralChange = DeltaAnalyzer.detectStructuralChange(delta) || 
                                 currentLineCount !== this.lastLineCount;
      
      if (isStructuralChange) {
        console.log('**** LineTrackerEventHandler **** Detected structural change, handling line operations');
        
        // Save cursor position before making changes
        this.cursorTracker.saveCursorPosition(this.quill);
        
        // Determine the type of structural change and where it occurred
        const { operationType, affectedLineIndex } = DeltaAnalyzer.analyzeStructuralChangeDetailed(
          delta, 
          currentLineCount, 
          this.lastLineCount,
          this.quill
        );
        
        console.log(`**** LineTrackerEventHandler **** Operation type detected: ${operationType} at line ${affectedLineIndex + 1}`);
        
        // Store last operation for debugging
        this.lastOperationType = operationType;
        this.lastAffectedIndex = affectedLineIndex;
        
        // Preserve existing UUIDs before any DOM manipulations
        this.uuidPreservation.preserveLineUuids();
        
        // Handle different types of line operations
        switch(operationType) {
          case LineOperationType.SPLIT:
            LineSplitHandler.handleLineSplit(this.quill, affectedLineIndex, this.linePosition);
            break;
            
          case LineOperationType.NEW:
            NewLineHandler.handleNewLines(
              this.quill, 
              affectedLineIndex, 
              this.lastLineCount, 
              this.linePosition,
              this.contentCache
            );
            break;
            
          case LineOperationType.ENTER_AT_ZERO:
            EnterAtZeroHandler.handleEnterAtZero(this.quill, this.linePosition);
            break;
            
          case LineOperationType.DELETE:
          case LineOperationType.MERGE:
            DeleteMergeHandler.handleDeleteOrMerge(this.quill, this.linePosition);
            break;
            
          default:
            this.cursorTracker.analyzeTextChange(delta, this.quill);
            this.linePosition.updateLineIndexAttributes(this.quill, false);
            break;
        }
        
        // Detect line count changes and update line indices
        this.linePosition.detectLineCountChanges(this.quill, false);
        
        // Restore UUIDs for existing lines
        this.uuidPreservation.restoreLineUuids();
        
        // Ensure that every line has a UUID (generate if missing)
        this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
        
        // Final check: Make sure all lines have different UUIDs
        UuidValidator.ensureUniqueUuids(lines);
        
        // Update content cache for future change detection
        this.contentCache.cacheLineContents(this.quill.getLines(0));
        
        // Restore cursor position after changes
        this.cursorTracker.restoreCursorPosition(this.quill);
        
        // Update the last known line count
        this.lastLineCount = currentLineCount;
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
