
/**
 * CursorPositionManager.ts - Handles cursor positions and operations
 */

export class CursorPositionManager {
  private quill: any;
  private lastOperation: { type: string, lineIndex: number, movedContent?: string } | null = null;
  private savedSelectionRange: { index: number, length: number } | null = null;
  private lastCursorPosition: { index: number, line: number } | null = null;

  constructor(quill: any) {
    this.quill = quill;
  }
  
  // Get last detected operation
  getLastOperation(): { type: string, lineIndex: number, movedContent?: string } | null {
    return this.lastOperation;
  }
  
  // Set last operation
  setLastOperation(operation: { type: string, lineIndex: number, movedContent?: string } | null): void {
    this.lastOperation = operation;
  }
  
  // Track cursor position
  trackCursorPosition(index: number, line: number): void {
    this.lastCursorPosition = { index, line };
  }
  
  // Get cursor position
  getCursorPosition(): { index: number, line: number } | null {
    return this.lastCursorPosition;
  }
  
  // Save current cursor position and selection
  saveCursorPosition(): void {
    if (!this.quill) return;
    
    const selection = this.quill.getSelection();
    if (selection) {
      this.savedSelectionRange = {
        index: selection.index,
        length: selection.length
      };
      console.log(`CursorPositionManager - Saved cursor at index ${selection.index}, length ${selection.length}`);
    }
  }
  
  // Restore previously saved cursor position and selection
  restoreCursorPosition(): void {
    if (!this.quill || !this.savedSelectionRange) return;
    
    // Small delay to ensure DOM is ready after content changes
    setTimeout(() => {
      try {
        const index = this.savedSelectionRange.index;
        const length = this.savedSelectionRange.length;
        
        // Check if the position is still valid in the document
        const docLength = this.quill.getLength();
        if (index < docLength) {
          this.quill.setSelection(index, length);
          console.log(`CursorPositionManager - Restored cursor to index ${index}, length ${length}`);
        } else {
          // Fallback to a safe position if original position is now invalid
          this.quill.setSelection(Math.min(index, docLength - 1), 0);
          console.log(`CursorPositionManager - Restored cursor to adjusted index ${Math.min(index, docLength - 1)}`);
        }
      } catch (e) {
        console.error('CursorPositionManager - Failed to restore cursor:', e);
      }
    }, 10);
  }
}
