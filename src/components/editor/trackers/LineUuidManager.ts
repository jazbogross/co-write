
/**
 * LineUuidManager.ts - Handles setting and getting UUIDs for lines
 */

import { LineUuidMap } from './LinePositionTypes';

export class LineUuidManager {
  private lineUuids: Map<number, string> = new Map();
  private quill: any = null;
  private readyState: 'not-ready' | 'initializing' | 'ready' = 'not-ready';
  private retryCount: number = 0;
  private maxRetries: number = 3;
  
  /**
   * Set the Quill editor instance
   */
  setQuill(quill: any): void {
    this.quill = quill;
    
    // Add editor-change event listener to check when editor is truly ready
    if (quill) {
      quill.on('editor-change', (eventName: string) => {
        if (eventName === 'text-change' && this.readyState === 'not-ready') {
          this.readyState = 'initializing';
        }
      });
    }
  }
  
  /**
   * Check if editor DOM is fully ready for UUID assignment
   */
  isEditorReady(): boolean {
    if (!this.quill) return false;
    
    try {
      const lines = this.quill.getLines(0);
      const editor = this.quill.root;
      
      if (!editor) return false;
      
      // Check if DOM elements exist for each line
      const paragraphs = editor.querySelectorAll('p');
      
      // Check if the line count matches the DOM paragraph count
      if (lines.length !== paragraphs.length) {
        return false;
      }
      
      // Check if each line has a corresponding DOM node
      const allLinesHaveDomNodes = lines.every((line: any) => line.domNode !== undefined);
      
      if (!allLinesHaveDomNodes) {
        return false;
      }
      
      // Editor appears ready
      if (this.readyState !== 'ready') {
        console.log('Editor is fully ready for UUID assignments');
        this.readyState = 'ready';
      }
      
      return true;
    } catch (error) {
      console.error('Error checking editor readiness:', error);
      return false;
    }
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
      console.error('Cannot apply UUIDs, no Quill editor available');
      return 0;
    }
    
    // Check if editor is ready
    if (!this.isEditorReady()) {
      // If we've tried too many times, log a warning but continue anyway
      if (this.retryCount >= this.maxRetries) {
        console.warn(`Editor not fully ready after ${this.maxRetries} retries, attempting to apply UUIDs anyway`);
      } else {
        this.retryCount++;
        
        // Schedule a retry after a delay
        setTimeout(() => {
          this.applyUuidsToDOM(lineData, editor);
        }, 200);
        
        return 0;
      }
    }
    
    const lines = editor.getLines(0);
    let appliedCount = 0;
    
    // Log the line counts for debugging
    console.log(`Applying UUIDs - lineData: ${lineData.length} lines, editor: ${lines.length} lines`);
    
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
    
    // Reset retry count after successful application
    if (appliedCount > 0) {
      this.retryCount = 0;
      console.log(`Applied ${appliedCount} UUIDs from lineData`);
    } else {
      console.warn(`No UUIDs applied, possible DOM or data issue`);
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
