
/**
 * LineTrackerEventHandler.ts - Handles event tracking for line changes
 * Refactored into smaller, focused components
 */

import { TextChangeHandler, TextChangeResult } from './handlers/TextChangeHandler';
import { ProgrammaticUpdateHandler } from './handlers/ProgrammaticUpdateHandler';
import { UuidRefreshHandler } from './handlers/UuidRefreshHandler';
import { SelectionChangeHandler } from './handlers/SelectionChangeHandler';
import { LineTrackerState } from './LineTrackerTypes';

export class LineTrackerEventHandler {
  private quill: any;
  private linePosition: any;
  private cursorTracker: any;
  private uuidPreservation: any;
  private isTextChange: boolean = false;
  private contentCache: any;
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
    
    // Initialize the content cache from the LineContentCache imported module
    const { LineContentCache } = require('./utils/LineContentCache');
    this.contentCache = new LineContentCache();
    
    // Initialize the last line count from the editor
    if (quill) {
      const lines = quill.getLines(0);
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
    SelectionChangeHandler.handleSelectionChange(
      range,
      state,
      this.cursorTracker,
      this.quill
    );
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
      const result: TextChangeResult = TextChangeHandler.handleTextChange(
        delta,
        oldDelta,
        source,
        state,
        this.quill,
        this.linePosition,
        this.cursorTracker,
        this.uuidPreservation,
        this.contentCache,
        getLineUuid
      );
      
      // Store operation info for debugging
      if (result) {
        this.lastOperationType = result.lastOperationType;
        this.lastAffectedIndex = result.lastAffectedIndex;
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
    ProgrammaticUpdateHandler.handleProgrammaticUpdate(
      value,
      this.uuidPreservation,
      this.cursorTracker,
      this.quill,
      this.isTextChange,
      getLineUuid
    );
  }

  /**
   * Refresh line UUIDs from lineData.
   */
  public refreshLineUuids(lineData: any[]): void {
    UuidRefreshHandler.refreshLineUuids(
      lineData,
      this.quill,
      this.contentCache
    );
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
