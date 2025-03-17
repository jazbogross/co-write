
/**
 * LineHistoryManager.ts - Manages history of line changes
 */

export class LineHistoryManager {
  private changeHistoryMap: Map<string, { content: string, timestamp: number }[]> = new Map();
  private readonly maxHistoryEntries: number = 5;
  
  constructor() {}
  
  /**
   * Records a content change for a specific line UUID
   */
  recordChange(uuid: string, content: string): void {
    if (!uuid || !content) return;
    
    if (!this.changeHistoryMap.has(uuid)) {
      this.changeHistoryMap.set(uuid, []);
    }
    
    const history = this.changeHistoryMap.get(uuid)!;
    
    // Only add if content is different from last entry
    if (history.length === 0 || history[history.length - 1].content !== content) {
      history.push({
        content,
        timestamp: Date.now()
      });
      
      // Trim history if it exceeds the limit
      if (history.length > this.maxHistoryEntries) {
        history.shift();
      }
    }
  }
  
  /**
   * Retrieves the change history for a specific line UUID
   */
  getChangeHistory(uuid: string): { content: string, timestamp: number }[] {
    return this.changeHistoryMap.get(uuid) || [];
  }
  
  /**
   * Clears history for a specific line
   */
  clearHistory(uuid: string): void {
    this.changeHistoryMap.delete(uuid);
  }
  
  /**
   * Clears all history
   */
  clearAllHistory(): void {
    this.changeHistoryMap.clear();
  }
}
