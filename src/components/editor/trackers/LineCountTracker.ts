
/**
 * LineCountTracker.ts - Tracks changes in line count
 */

export class LineCountTracker {
  private lastKnownLines: number = 0;
  
  /**
   * Detect changes in line count
   */
  detectLineCountChanges(quill: any, isProgrammaticUpdate: boolean = false): void {
    // Skip during programmatic updates
    if (isProgrammaticUpdate) {
      console.log('**** LineCountTracker **** Skipping line count change detection during programmatic update');
      return;
    }
    
    if (!quill) return;
    
    const lines = quill.getLines(0);
    const currentLineCount = lines.length;
    
    if (currentLineCount !== this.lastKnownLines) {
      console.log(`**** LineCountTracker **** Line count changed: ${this.lastKnownLines} -> ${currentLineCount}`);
      
      // Simple detection of line insertion/deletion
      if (currentLineCount > this.lastKnownLines) {
        console.log(`**** LineCountTracker **** Lines inserted: ${currentLineCount - this.lastKnownLines}`);
      } else {
        console.log(`**** LineCountTracker **** Lines deleted: ${this.lastKnownLines - currentLineCount}`);
      }
      
      this.lastKnownLines = currentLineCount;
    }
  }
  
  /**
   * Reset line count
   */
  resetLineCount(count: number): void {
    this.lastKnownLines = count;
  }
  
  /**
   * Get current line count
   */
  getLineCount(): number {
    return this.lastKnownLines;
  }
}
