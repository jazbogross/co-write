
/**
 * UuidDomManager.ts - Handles DOM operations for line UUIDs
 */

export class UuidDomManager {
  /**
   * Apply UUIDs to DOM elements from an array of line data
   */
  applyUuidsToDOM(lineData: any[], quill: any, getLineUuid: (index: number) => string | undefined): number {
    if (!quill) {
      console.error('Cannot apply UUIDs, no Quill editor available');
      return 0;
    }

    const lines = quill.getLines(0);
    let appliedCount = 0;
    
    // Safety check for array bounds
    const minLength = Math.min(lines.length, lineData.length);
    
    for (let index = 0; index < minLength; index++) {
      if (lines[index].domNode && lineData[index] && lineData[index].uuid) {
        const uuid = lineData[index].uuid;
        const currentUuid = lines[index].domNode.getAttribute('data-line-uuid');
        
        if (!currentUuid || currentUuid !== uuid) {
          lines[index].domNode.setAttribute('data-line-uuid', uuid);
          lines[index].domNode.setAttribute('data-line-index', String(index + 1));
          appliedCount++;
        }
      }
    }
    
    return appliedCount;
  }

  /**
   * Get a map of line indexes to UUIDs from the DOM
   */
  getDomUuidMap(quill: any): Map<number, string> {
    const map = new Map<number, string>();
    
    // Safety check
    if (!quill) {
      return map;
    }
    
    const lines = quill.getLines(0);
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          map.set(index, uuid);
        }
      }
    });
    
    return map;
  }

  /**
   * Update DOM element with UUID
   */
  updateDomUuid(quill: any, index: number, uuid: string): boolean {
    if (!quill) return false;
    
    try {
      const lines = quill.getLines(0);
      if (lines[index] && lines[index].domNode) {
        lines[index].domNode.setAttribute('data-line-uuid', uuid);
        lines[index].domNode.setAttribute('data-line-index', String(index + 1));
        return true;
      }
    } catch (e) {
      console.error('Error updating DOM UUID:', e);
    }
    
    return false;
  }
}
