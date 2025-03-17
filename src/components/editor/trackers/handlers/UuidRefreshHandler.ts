
/**
 * UuidRefreshHandler.ts - Handles refreshing UUIDs for lines
 */

import { UuidValidator } from '../utils/UuidValidator';

export class UuidRefreshHandler {
  /**
   * Refresh line UUIDs from lineData
   */
  public static refreshLineUuids(
    lineData: any[],
    quill: any,
    contentCache: any
  ): void {
    if (!lineData || lineData.length === 0) return;
    
    const lines = quill.getLines(0);
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i >= lineData.length || !lineData[i]) {
        const newUuid = crypto.randomUUID();
        const newLineDataItem = { uuid: newUuid, lineNumber: i + 1 };
        lineData[i] = newLineDataItem;
        console.log(`UuidRefreshHandler - New line inserted at position ${i + 1} assigned UUID: ${newUuid}`);
      } else if (!lineData[i].uuid) {
        const newUuid = crypto.randomUUID();
        lineData[i].uuid = newUuid;
        console.log(`UuidRefreshHandler - Assigned new UUID for line ${i + 1}: ${newUuid}`);
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
    
    UuidValidator.ensureUniqueUuids(lines);
    
    if (contentCache) {
      contentCache.cacheLineContents(lines);
    }
    
    return lines.length;
  }
}
