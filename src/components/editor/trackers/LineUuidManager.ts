
/**
 * LineUuidManager.ts - Handles setting and getting UUIDs for lines
 */

import { LinePositionTypes } from './index';

export class LineUuidManager {
  private lineUuids: Map<number, string> = new Map();
  private quill: any = null;
  
  /**
   * Set the Quill editor instance
   */
  setQuill(quill: any): void {
    this.quill = quill;
  }
  
  /**
   * Get the UUID for a line by index
   */
  getLineUuid(oneBasedIndex: number): string | undefined {
    const zeroBasedIndex = oneBasedIndex - 1;
    return this.lineUuids.get(zeroBasedIndex);
  }
  
  /**
   * Set UUID for a line by index
   */
  setLineUuid(oneBasedIndex: number, uuid: string, quill?: any): void {
    const zeroBasedIndex = oneBasedIndex - 1;
    this.lineUuids.set(zeroBasedIndex, uuid);
    
    // Use provided quill instance or stored reference
    const editor = quill || this.quill;
    
    // Update the DOM element if it exists
    if (editor) {
      const lines = editor.getLines(0);
      if (lines[zeroBasedIndex] && lines[zeroBasedIndex].domNode) {
        lines[zeroBasedIndex].domNode.setAttribute('data-line-uuid', uuid);
        
        // Also update line index
        lines[zeroBasedIndex].domNode.setAttribute('data-line-index', String(oneBasedIndex));
      }
    }
  }
  
  /**
   * Apply UUIDs to DOM elements from an array of line data
   */
  applyUuidsToDOM(lineData: any[], quill?: any): number {
    // Use provided quill instance or stored reference  
    const editor = quill || this.quill;
    
    if (!editor) {
      console.error('**** LineUuidManager **** Cannot apply UUIDs, no Quill editor available');
      return 0;
    }
    
    const lines = editor.getLines(0);
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
          
          // Update our tracking map
          this.lineUuids.set(index, uuid);
          appliedCount++;
        }
      }
    }
    
    if (appliedCount > 0) {
      console.log(`**** LineUuidManager **** Applied ${appliedCount} UUIDs from lineData`);
    }
    
    return appliedCount;
  }
  
  /**
   * Get a map of line indexes to UUIDs from the DOM
   */
  getDomUuidMap(quill?: any): Map<number, string> {
    const map = new Map<number, string>();
    
    // Use provided quill instance or stored reference
    const editor = quill || this.quill;
    
    // Safety check
    if (!editor) {
      console.warn('**** LineUuidManager **** No Quill instance available for getDomUuidMap');
      return map;
    }
    
    const lines = editor.getLines(0);
    
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
   * Clear all UUID mappings
   */
  clear(): void {
    this.lineUuids.clear();
  }
  
  /**
   * Get the internal line UUID map
   */
  getLineUuidMap(): Map<number, string> {
    return this.lineUuids;
  }
}
