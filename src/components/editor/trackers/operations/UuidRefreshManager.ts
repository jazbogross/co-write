
/**
 * UuidRefreshManager.ts - Manages refreshing UUIDs for lines
 */

import { UuidValidator } from '../utils/UuidValidator';

export class UuidRefreshManager {
  /**
   * Refresh UUIDs for all lines based on lineData
   */
  public static refreshLineUuids(
    lineData: any[],
    quill: any,
    contentCache: any
  ): void {
    if (!lineData || lineData.length === 0 || !quill) return;
    
    const lines = quill.getLines(0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle missing line data
      if (i >= lineData.length || !lineData[i]) {
        const newUuid = crypto.randomUUID();
        const newLineDataItem = { uuid: newUuid, lineNumber: i + 1 };
        lineData[i] = newLineDataItem;
        console.log(`UuidRefreshManager - New line inserted at position ${i + 1} assigned UUID: ${newUuid}`);
      } 
      // Handle missing UUIDs
      else if (!lineData[i].uuid) {
        const newUuid = crypto.randomUUID();
        lineData[i].uuid = newUuid;
        console.log(`UuidRefreshManager - Assigned new UUID for line ${i + 1}: ${newUuid}`);
      }
      
      // Update DOM node with UUID if needed
      if (line.domNode) {
        const currentUuid = line.domNode.getAttribute('data-line-uuid');
        const newUuid = lineData[i].uuid;
        if (currentUuid !== newUuid) {
          line.domNode.setAttribute('data-line-uuid', newUuid);
          line.domNode.setAttribute('data-line-index', String(i + 1));
        }
      }
    }
    
    // Ensure all UUIDs are unique
    UuidValidator.ensureUniqueUuids(lines);
    
    // Cache updated contents
    if (contentCache) {
      contentCache.cacheLineContents(lines);
    }
    
    return lines.length;
  }
}
