
/**
 * CursorTracker.ts - Tracks cursor position and operations
 */

export class CursorTracker {
  private lastCursorPosition: { index: number, line: number } | null = null;
  private lastOperation: { type: string, lineIndex: number, movedContent?: string } | null = null;
  private savedSelectionRange: { index: number, length: number } | null = null;

  constructor() {
    this.resetOperation();
  }

  // Reset last detected operation
  resetOperation(): void {
    this.lastOperation = null;
  }

  // Track cursor position changes
  trackCursorChange(range: any, quill: any): void {
    if (range) {
      const lineIndex = this.getLineIndexFromPosition(range.index, quill);
      this.lastCursorPosition = {
        index: range.index,
        line: lineIndex
      };
      
      // Also save the full selection range for restoration
      this.savedSelectionRange = {
        index: range.index,
        length: range.length || 0
      };
    }
  }

  // Get line index from cursor position
  private getLineIndexFromPosition(position: number, quill: any): number {
    const [line] = quill.getLeaf(position);
    if (!line) return 0;
    
    const lines = quill.getLines(0);
    return lines.findIndex((l: any) => l === line.parent);
  }

  // Analyze text changes to detect operations like Enter key presses
  analyzeTextChange(delta: any, quill: any): void {
    // Reset last operation
    this.resetOperation();
    
    if (!delta || !delta.ops || !this.lastCursorPosition) return;
    
    // Check for "\n" insertion (Enter key press)
    const isEnterPress = delta.ops.some((op: any) => 
      op.insert && op.insert === "\n"
    );
    
    if (isEnterPress) {
      this.detectEnterOperation(quill);
    }
  }

  // Detect Enter key operations, especially at position 0
  private detectEnterOperation(quill: any): void {
    const cursorLineIndex = this.lastCursorPosition?.line;
    const cursorPosition = this.lastCursorPosition?.index;
    
    if (cursorLineIndex === undefined || cursorPosition === undefined) return;
    
    const lines = quill.getLines(0);
    
    if (cursorLineIndex >= 0 && cursorLineIndex < lines.length) {
      const line = lines[cursorLineIndex];
      const lineStart = quill.getIndex(line);
      
      // Check if cursor was at position 0 of the line
      if (cursorPosition === lineStart) {
        // Get the actual line content BEFORE the split
        // This is the critical fix - we need to capture what was on the line
        // before it gets moved to the next line
        let lineContent = '';
        
        // Get the current line's text content from the DOM node
        if (line && line.domNode) {
          lineContent = line.domNode.textContent || '';
        } else {
          // Fallback to delta if DOM node isn't available
          lineContent = this.getLineContent(line);
        }
        
        // Store complete operation details for line matching
        this.lastOperation = {
          type: 'enter-at-position-0',
          lineIndex: cursorLineIndex,
          movedContent: lineContent.trim() // Store trimmed content that will move
        };
        
        console.log(`**** CursorTracker **** Detected Enter at position 0 of line ${cursorLineIndex + 1}`);
        console.log(`**** CursorTracker **** Content "${lineContent}" will move to line ${cursorLineIndex + 2}`);
      }
    }
  }

  // Get content from a line
  private getLineContent(line: any): string {
    if (!line) return '';
    return line.cache?.delta?.ops?.[0]?.insert || '';
  }

  // Save current cursor position and selection
  saveCursorPosition(quill: any): void {
    if (!quill) return;
    
    const selection = quill.getSelection();
    if (selection) {
      this.savedSelectionRange = {
        index: selection.index,
        length: selection.length
      };
      console.log(`**** CursorTracker **** Saved cursor at index ${selection.index}, length ${selection.length}`);
    }
  }

  // Restore previously saved cursor position and selection
  restoreCursorPosition(quill: any): void {
    if (!quill || !this.savedSelectionRange) return;
    
    // Small delay to ensure DOM is ready after content changes
    setTimeout(() => {
      try {
        const index = this.savedSelectionRange.index;
        const length = this.savedSelectionRange.length;
        
        // Check if the position is still valid in the document
        const docLength = quill.getLength();
        if (index < docLength) {
          quill.setSelection(index, length);
          console.log(`**** CursorTracker **** Restored cursor to index ${index}, length ${length}`);
        } else {
          // Fallback to a safe position if original position is now invalid
          quill.setSelection(Math.min(index, docLength - 1), 0);
          console.log(`**** CursorTracker **** Restored cursor to adjusted index ${Math.min(index, docLength - 1)}`);
        }
      } catch (e) {
        console.error('**** CursorTracker **** Failed to restore cursor:', e);
      }
    }, 10);
  }

  // Get last detected operation
  getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null {
    return this.lastOperation;
  }

  // Get the current cursor position
  getCursorPosition(): { index: number, line: number } | null {
    return this.lastCursorPosition;
  }
}
