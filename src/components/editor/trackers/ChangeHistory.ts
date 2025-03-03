
/**
 * ChangeHistory.ts - Tracks changes to line content over time
 */

export class ChangeHistory {
  private changeHistory: Map<string, {content: string, timestamp: number}[]> = new Map();
  private changeHistoryLimit: number = 5;

  // Record a content change for a line UUID
  recordChange(uuid: string, content: string): void {
    if (!this.changeHistory.has(uuid)) {
      this.changeHistory.set(uuid, []);
    }
    
    const history = this.changeHistory.get(uuid)!;
    
    // Only record if content actually changed
    if (history.length === 0 || history[history.length - 1].content !== content) {
      history.push({
        content,
        timestamp: Date.now()
      });
      
      // Trim history if it exceeds limit
      if (history.length > this.changeHistoryLimit) {
        history.shift();
      }
    }
  }

  // Get change history for a UUID
  getChangeHistory(uuid: string): {content: string, timestamp: number}[] {
    return this.changeHistory.get(uuid) || [];
  }
}
