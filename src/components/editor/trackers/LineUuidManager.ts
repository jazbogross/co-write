
/**
 * LineUuidManager.ts - Handles setting and getting UUIDs for lines
 * Refactored into smaller components
 */

import { LineUuidMapManager } from './LineUuidMapManager';
import { EditorReadinessChecker } from './EditorReadinessChecker';
import { UuidMapOperations } from './UuidManagerTypes';

export class LineUuidManager implements UuidMapOperations {
  private uuidMapManager: LineUuidMapManager;
  private readinessChecker: EditorReadinessChecker;
  private retryCount: number = 0;
  private maxRetries: number = 3;
  
  constructor() {
    this.uuidMapManager = new LineUuidMapManager();
    this.readinessChecker = new EditorReadinessChecker();
  }
  
  /**
   * Set the Quill editor instance
   */
  setQuill(quill: any): void {
    this.readinessChecker.setQuill(quill);
    this.uuidMapManager.setQuill(quill);
  }
  
  /**
   * Check if editor DOM is fully ready for UUID assignment
   */
  isEditorReady(): boolean {
    return this.readinessChecker.isEditorReady();
  }
  
  /**
   * Get the UUID for a line by index
   */
  getLineUuid(oneBasedIndex: number): string | undefined {
    return this.uuidMapManager.getLineUuid(oneBasedIndex);
  }
  
  /**
   * Set UUID for a line by index
   */
  setLineUuid(oneBasedIndex: number, uuid: string, quill?: any): void {
    this.uuidMapManager.setLineUuid(oneBasedIndex, uuid, quill);
  }
  
  /**
   * Apply UUIDs to DOM elements from an array of line data
   */
  applyUuidsToDOM(lineData: any[], quill?: any): number {
    // Check if editor is ready
    if (!this.isEditorReady()) {
      // If we've tried too many times, log a warning but continue anyway
      if (this.retryCount >= this.maxRetries) {
        console.warn(`Editor not fully ready after ${this.maxRetries} retries, attempting to apply UUIDs anyway`);
      } else {
        this.retryCount++;
        
        // Schedule a retry after a delay
        setTimeout(() => {
          this.applyUuidsToDOM(lineData, quill);
        }, 200);
        
        return 0;
      }
    }
    
    // Reset retry count after successful application
    const appliedCount = this.uuidMapManager.applyUuidsToDOM(lineData, quill);
    if (appliedCount > 0) {
      this.retryCount = 0;
    }
    
    return appliedCount;
  }
  
  /**
   * Get a map of line indexes to UUIDs from the DOM
   */
  getDomUuidMap(quill?: any): Map<number, string> {
    return this.uuidMapManager.getDomUuidMap(quill);
  }
  
  /**
   * Clear all UUID mappings
   */
  clear(): void {
    this.uuidMapManager.clear();
  }
  
  /**
   * Get the internal line UUID map
   */
  getLineUuidMap(): Map<number, string> {
    return this.uuidMapManager.getLineUuidMap();
  }
}
