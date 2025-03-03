
/**
 * CursorTracker.ts - Tracks cursor position and operations
 */

export class CursorTracker {
  private lastCursorPosition: { index: number, line: number } | null = null;
  private lastOperation: { type: string, lineIndex: number, movedContent?: string } | null = null;

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
        const lineContent = this.getLineContent(line);
        
        this.lastOperation = {
          type: 'enter-at-position-0',
          lineIndex: cursorLineIndex,
          movedContent: lineContent
        };
        
        console.log(`**** CursorTracker **** Detected Enter at position 0 of line ${cursorLineIndex + 1}`);
        console.log(`**** CursorTracker **** Content "${lineContent}" will move to line ${cursorLineIndex + 2}`);
      }
    }
  }

  // Get content from a line
  private getLineContent(line: any): string {
    return line.cache?.delta?.ops?.[0]?.insert || '';
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
