
/**
 * LineUuidMapManager.ts - Manages the map of line indexes to UUIDs
 */

import { UuidMapOperations } from './UuidManagerTypes';
import { UuidDomManager } from './UuidDomManager';

export class LineUuidMapManager implements UuidMapOperations {
  private lineUuids: Map<number, string> = new Map();
  private uuidDomManager: UuidDomManager;
  private quill: any = null;
  
  constructor() {
    this.uuidDomManager = new UuidDomManager();
  }
  
  /**
   * Set quill instance
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
      this.uuidDomManager.updateDomUuid(editor, zeroBasedIndex, uuid);
    }
  }
  
  /**
   * Get the DOM UUID map
   */
  getDomUuidMap(quill?: any): Map<number, string> {
    return this.uuidDomManager.getDomUuidMap(quill || this.quill);
  }
  
  /**
   * Apply UUIDs to DOM
   */
  applyUuidsToDOM(lineData: any[], quill?: any): number {
    const editor = quill || this.quill;
    if (!editor) return 0;
    
    const appliedCount = this.uuidDomManager.applyUuidsToDOM(
      lineData, 
      editor, 
      (index: number) => this.getLineUuid(index + 1)
    );
    
    // Update our tracking map
    for (let i = 0; i < Math.min(lineData.length, editor.getLines(0).length); i++) {
      if (lineData[i] && lineData[i].uuid) {
        this.lineUuids.set(i, lineData[i].uuid);
      }
    }
    
    return appliedCount;
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
