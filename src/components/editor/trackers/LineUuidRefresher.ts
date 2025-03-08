
/**
 * LineUuidRefresher.ts - Manages refreshing of line UUIDs
 */

export class LineUuidRefresher {
  private lineUuidManager: any;
  private quill: any = null;
  
  constructor(lineUuidManager: any) {
    this.lineUuidManager = lineUuidManager;
  }
  
  /**
   * Set quill instance
   */
  setQuill(quill: any): void {
    this.quill = quill;
  }
  
  /**
   * Apply UUIDs from lineData to DOM
   */
  applyLineDataUuids(lineData: any[]): number {
    return this.lineUuidManager.applyUuidsToDOM(lineData, this.quill);
  }
  
  /**
   * Explicitly refresh all UUIDs from lineData
   */
  refreshLineUuids(lineData: any[]): void {
    if (!this.quill || !lineData || lineData.length === 0) {
      console.log('**** LineUuidRefresher **** Cannot refresh UUIDs, missing quill or lineData');
      return;
    }
    
    console.log(`**** LineUuidRefresher **** Refreshing all UUIDs for ${lineData.length} lines`);
    const applyCount = this.applyLineDataUuids(lineData);
    console.log(`**** LineUuidRefresher **** UUID refresh complete, applied ${applyCount} UUIDs`);
  }
  
  /**
   * Check for missing UUIDs after initialization
   */
  checkForMissingUuids(lines: any[]): void {
    if (!lines) return;
    
    const missingCount = lines.filter(line => 
      line.domNode && !line.domNode.getAttribute('data-line-uuid')
    ).length;
    
    if (missingCount > 0) {
      console.log(`**** LineUuidRefresher **** Found ${missingCount} lines with missing UUIDs`);
    }
  }
}
