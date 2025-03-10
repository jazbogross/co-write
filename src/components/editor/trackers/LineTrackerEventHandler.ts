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
  private lastOperationType: string | null = null;
  private lastAffectedIndex: number = -1;
  private preventUuidRegenerationOnDelete: boolean = true;

  // Define operation types for structural changes
  private operationTypes = {
    SPLIT: 'split',
    NEW: 'new',
    MERGE: 'merge',
    DELETE: 'delete',
    MODIFY: 'modify',
    ENTER_AT_ZERO: 'enter-at-position-0'
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
      const isStructuralChange = this.detectStructuralChange(delta) || 
                                 currentLineCount !== this.lastLineCount;
      
      if (isStructuralChange) {
        console.log('**** LineTrackerEventHandler **** Detected structural change, handling line operations');
        
        // Save cursor position before making changes
        this.cursorTracker.saveCursorPosition(this.quill);
        
        // Determine the type of structural change and where it occurred
        const { operationType, affectedLineIndex } = this.analyzeStructuralChangeDetailed(delta, currentLineCount);
        console.log(`**** LineTrackerEventHandler **** Operation type detected: ${operationType} at line ${affectedLineIndex + 1}`);
        
        // Store last operation for debugging
        this.lastOperationType = operationType;
        this.lastAffectedIndex = affectedLineIndex;
        
        // Preserve existing UUIDs before any DOM manipulations
        this.uuidPreservation.preserveLineUuids();
        
        // Handle different types of line operations
        if (operationType === this.operationTypes.SPLIT) {
          this.handleLineSplit(lines, affectedLineIndex, currentLineCount);
        } else if (operationType === this.operationTypes.NEW) {
          this.handleNewLines(lines, affectedLineIndex, currentLineCount);
        } else if (operationType === this.operationTypes.ENTER_AT_ZERO) {
          this.handleEnterAtZero(lines, currentLineCount);
        } else if (operationType === this.operationTypes.DELETE || operationType === this.operationTypes.MERGE) {
          this.handleDeleteOrMerge(lines, currentLineCount);
        } else {
          this.cursorTracker.analyzeTextChange(delta, this.quill);
          this.linePosition.updateLineIndexAttributes(this.quill, false);
        }
        
        // Detect line count changes and update line indices
        this.linePosition.detectLineCountChanges(this.quill, false);
        
        // Restore UUIDs for existing lines
        this.uuidPreservation.restoreLineUuids();
        
        // Ensure that every line has a UUID (generate if missing)
        this.uuidPreservation.ensureAllLinesHaveUuids(getLineUuid);
        
        // Final check: Make sure all lines have different UUIDs
        this.ensureUniqueUuids(lines);
        
        // Update content cache for future change detection
        this.cacheLineContents(this.quill.getLines(0));
        
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
   * Handle deletion or merge operations by completely preserving existing UUIDs
   * This ensures cursor position line doesn't get a new UUID after deletion
   */
  private handleDeleteOrMerge(lines: any[], currentLineCount: number): void {
    console.log(`**** LineTrackerEventHandler **** Handling delete/merge, preserving all UUIDs`);
    
    // For delete operations, we mainly want to preserve existing UUIDs and
    // NOT generate new ones for the remaining lines
    
    // Update line indices to reflect the new positions
    this.linePosition.updateLineIndexAttributes(this.quill, false);
    
    // Log the current UUIDs to verify they're preserved
    if (lines.length > 0) {
      console.log('**** LineTrackerEventHandler **** UUIDs after delete/merge:');
      lines.forEach((line, index) => {
        if (line.domNode) {
          const uuid = line.domNode.getAttribute('data-line-uuid');
          console.log(`**** Line ${index + 1} UUID: ${uuid || 'missing'}`);
        }
      });
    }
  }

  /**
   * Ensure all lines have unique UUIDs
   */
  private ensureUniqueUuids(lines: any[]): void {
    const seenUuids = new Set<string>();
    const duplicates: number[] = [];
    
    // First pass: detect duplicates
    lines.forEach((line, index) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          if (seenUuids.has(uuid)) {
            duplicates.push(index);
          } else {
            seenUuids.add(uuid);
          }
        }
      }
    });
    
    // Second pass: fix duplicates
    if (duplicates.length > 0) {
      console.log(`**** LineTrackerEventHandler **** Found ${duplicates.length} lines with duplicate UUIDs, fixing...`);
      
      duplicates.forEach(index => {
        const line = lines[index];
        if (line && line.domNode) {
          const newUuid = crypto.randomUUID();
          line.domNode.setAttribute('data-line-uuid', newUuid);
          line.domNode.setAttribute('data-line-index', String(index + 1));
          console.log(`**** LineTrackerEventHandler **** Fixed duplicate UUID at line ${index + 1}, assigned new UUID: ${newUuid}`);
        }
      });
    }
  }

  /**
   * Handle special case: Enter at position 0
   * This creates a new blank line at the beginning
   */
  private handleEnterAtZero(lines: any[], currentLineCount: number): void {
    console.log(`**** LineTrackerEventHandler **** Handling Enter at position 0`);
    
    // The first line should get a new UUID (the empty line)
    if (lines.length > 0 && lines[0].domNode) {
      // Generate and assign a new UUID for the first line
      const newUuid = crypto.randomUUID();
      lines[0].domNode.setAttribute('data-line-uuid', newUuid);
      lines[0].domNode.setAttribute('data-line-index', String(1));
      console.log(`**** LineTrackerEventHandler **** Assigned new UUID ${newUuid} to new first line`);
    }
    
    // Update all line indices
    this.linePosition.updateLineIndexAttributes(this.quill, false);
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
      const hasSameUuid = this.checkForUuidDuplication(line, lines);
      
      if ((isNewLine || hasSameUuid) && line && line.domNode) {
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
   * Check if a line has duplicated UUID with any other line
   */
  private checkForUuidDuplication(line: any, lines: any[]): boolean {
    if (!line || !line.domNode) return false;
    
    const lineUuid = line.domNode.getAttribute('data-line-uuid');
    if (!lineUuid) return false;
    
    let count = 0;
    lines.forEach((otherLine: any) => {
      if (otherLine.domNode && otherLine.domNode.getAttribute('data-line-uuid') === lineUuid) {
        count++;
      }
    });
    
    return count > 1; // Return true if this UUID appears more than once
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
    
    // Check for enter at position 0 (new line at beginning)
    const isEnterAtZero = this.detectEnterAtZero(delta, affectedLineIndex);
    if (isEnterAtZero) {
      return { 
        operationType: this.operationTypes.ENTER_AT_ZERO, 
        affectedLineIndex: 0 
      };
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
      let hasDelete = false;
      
      for (const op of delta.ops) {
        if (op.delete) {
          hasDelete = true;
          break;
        }
      }
      
      // If delta contains delete operation, mark as delete
      // Otherwise, it's likely a merge (e.g., backspace at start of line)
      operationType = hasDelete ? this.operationTypes.DELETE : this.operationTypes.MERGE;
    }
    
    return { operationType, affectedLineIndex };
  }

  /**
   * Detect the special case of Enter at position 0
   */
  private detectEnterAtZero(delta: any, affectedLineIndex: number): boolean {
    // Special case: Enter at index 0 creates a new empty line at the beginning
    if (affectedLineIndex === 0 && delta.ops) {
      for (const op of delta.ops) {
        if (op.insert === '\n' && op.retain === undefined) {
          return true;
        }
      }
    }
    return false;
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
      
      this.ensureUniqueUuids(this.quill.getLines(0));
      
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
    
    this.ensureUniqueUuids(lines);
    
    this.cacheLineContents(lines);
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
