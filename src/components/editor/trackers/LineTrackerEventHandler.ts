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
  private contentCache: Map<number, string> = new Map();
  
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
      // Cache initial line content for better change detection
      this.cacheLineContents(lines);
    }
  }

  /**
   * Cache line contents for better change detection
   */
  private cacheLineContents(lines: any[]): void {
    this.contentCache.clear();
    lines.forEach((line, index) => {
      const content = this.getLineContent(line);
      this.contentCache.set(index, content);
    });
  }

  /**
   * Get content from a line
   */
  private getLineContent(line: any): string {
    if (!line || !line.cache || !line.cache.delta || !line.cache.delta.ops) {
      return '';
    }
    return line.cache.delta.ops?.[0]?.insert || '';
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
        
        // Determine the type of structural change and where it occurred
        const { operationType, affectedLineIndex } = this.analyzeStructuralChangeDetailed(delta, currentLineCount);
        console.log(`**** LineTrackerEventHandler **** Operation type detected: ${operationType} at line ${affectedLineIndex + 1}`);
        
        // Preserve existing UUIDs before any DOM manipulations
        this.uuidPreservation.preserveLineUuids();
        
        // Handle different types of line operations
        if (operationType === this.operationTypes.SPLIT) {
          this.handleLineSplit(lines, affectedLineIndex, currentLineCount);
        } else if (operationType === this.operationTypes.NEW) {
          this.handleNewLines(lines, affectedLineIndex, currentLineCount);
        } else if (operationType === this.operationTypes.MERGE) {
          // For merges, standard handling with preserved UUIDs is sufficient
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
        } else {
          // For modifications, standard handling
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
        }
        
        // Detect line count changes and update line indices
        this.linePosition.detectLineCountChanges(this.quill, false);
        
        // Restore UUIDs for existing lines
        this.uuidPreservation.restoreLineUuids();
        
        // Ensure that every line has a UUID (generate if missing)
        this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
        
        // Update content cache for future change detection
        this.cacheLineContents(this.quill.getLines(0));
        
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
   * Handle line splits - keep the UUID for the original line, generate new UUIDs for the newly created lines
   */
  private handleLineSplit(lines: any[], splitLineIndex: number, currentLineCount: number): void {
    console.log(`**** LineTrackerEventHandler **** Handling line split at index ${splitLineIndex}`);
    
    // The line at the split index should keep its original UUID (will be restored by UuidPreservation)
    // The new line created after the split should get a new UUID
    if (splitLineIndex >= 0 && splitLineIndex < lines.length - 1) {
      const newLineIndex = splitLineIndex + 1;
      const newLine = lines[newLineIndex];
      
      if (newLine && newLine.domNode) {
        // Explicitly clear any inherited UUID to ensure we don't keep an old one
        newLine.domNode.removeAttribute('data-line-uuid');
        
        // Generate and assign a new UUID
        const newUuid = crypto.randomUUID();
        newLine.domNode.setAttribute('data-line-uuid', newUuid);
        newLine.domNode.setAttribute('data-line-index', String(newLineIndex + 1));
        console.log(`**** LineTrackerEventHandler **** Assigned new UUID ${newUuid} to split line ${newLineIndex + 1}`);
      }
    }
    
    // Update line indices for all lines
    this.linePosition.updateLineIndexAttributes(this.quill, false);
  }

  /**
   * Handle new lines - generate new UUIDs for all newly added lines
   */
  private handleNewLines(lines: any[], startLineIndex: number, currentLineCount: number): void {
    console.log(`**** LineTrackerEventHandler **** Handling new lines starting at index ${startLineIndex}`);
    
    // Identify new lines that need UUIDs
    for (let i = Math.max(0, startLineIndex); i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this is likely a new line by comparing with our cached content
      const isNewLine = i >= this.lastLineCount || !this.contentCache.has(i);
      
      if (isNewLine && line && line.domNode) {
        // Remove any existing UUID that might have been inherited
        line.domNode.removeAttribute('data-line-uuid');
        
        // Generate and assign a new UUID
        const newUuid = crypto.randomUUID();
        line.domNode.setAttribute('data-line-uuid', newUuid);
        line.domNode.setAttribute('data-line-index', String(i + 1));
        console.log(`**** LineTrackerEventHandler **** Assigned new UUID ${newUuid} to new line ${i + 1}`);
      }
    }
    
    // Update line indices for all lines
    this.linePosition.updateLineIndexAttributes(this.quill, false);
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
   * Analyze the type of structural change with more detail.
   * Returns the operation type and the affected line index.
   */
  private analyzeStructuralChangeDetailed(delta: any, currentLineCount: number): { 
    operationType: string; 
    affectedLineIndex: number;
  } {
    if (!delta || !delta.ops) {
      return { operationType: this.operationTypes.MODIFY, affectedLineIndex: -1 };
    }
    
    let affectedLineIndex = -1;
    let operationType = this.operationTypes.MODIFY;
    
    // Try to determine which line was affected based on delta
    const selection = this.quill.getSelection();
    if (selection) {
      // Find the line index based on selection
      const lines = this.quill.getLines(0, selection.index);
      affectedLineIndex = lines.length - 1;
    }
    
    if (currentLineCount > this.lastLineCount) {
      // Find which operation added lines
      let wasExactNewlineInsert = false;
      
      for (const op of delta.ops) {
        if (op.insert && typeof op.insert === 'string') {
          if (op.insert === '\n') {
            // This is a pure newline insertion (pressing Enter) -> split
            operationType = this.operationTypes.SPLIT;
            wasExactNewlineInsert = true;
          } else if (op.insert.includes('\n')) {
            // This contains newlines along with other content -> new content
            operationType = this.operationTypes.NEW;
          }
        }
      }
      
      // If we couldn't determine precisely, use a fallback
      if (!wasExactNewlineInsert && operationType !== this.operationTypes.NEW) {
        operationType = this.operationTypes.NEW;
      }
    } else if (currentLineCount < this.lastLineCount) {
      operationType = this.operationTypes.MERGE;
    }
    
    return { operationType, affectedLineIndex };
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
    
    // Update our content cache after refresh
    this.cacheLineContents(lines);
    this.lastLineCount = lines.length;
  }
}
