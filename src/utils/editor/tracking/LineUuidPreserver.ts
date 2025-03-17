
import { LineUuidMap } from './LineUuidMap';

/**
 * Class for preserving line UUIDs during editing operations
 */
export class LineUuidPreserver {
  private preservedUuids: Map<string, string> = new Map();
  private contentMap: Map<string, string> = new Map();
  
  /**
   * Preserve UUIDs from DOM elements
   */
  preserveUuids(elements: HTMLElement[]): void {
    this.preservedUuids.clear();
    this.contentMap.clear();
    
    elements.forEach(element => {
      const uuid = element.getAttribute('data-line-uuid');
      if (uuid) {
        this.preservedUuids.set(uuid, uuid);
        this.contentMap.set(uuid, element.textContent || '');
      }
    });
  }
  
  /**
   * Restore UUIDs to DOM elements based on content matching or position
   */
  restoreUuids(elements: HTMLElement[]): Map<number, string> {
    const restoredMap = new LineUuidMap();
    
    if (elements.length === 0 || this.preservedUuids.size === 0) {
      return restoredMap.toMap(); // Convert to standard Map
    }
    
    // First try exact content matching
    elements.forEach((element, index) => {
      const content = element.textContent || '';
      
      // Try to find a matching preserved UUID by content
      for (const [uuid, preservedContent] of this.contentMap.entries()) {
        if (content === preservedContent && this.preservedUuids.has(uuid)) {
          element.setAttribute('data-line-uuid', uuid);
          restoredMap.setUuid(index, uuid);
          this.preservedUuids.delete(uuid);
          break;
        }
      }
    });
    
    // For any elements that didn't get a UUID, try assigning remaining preserved UUIDs by position
    elements.forEach((element, index) => {
      if (!element.hasAttribute('data-line-uuid') && this.preservedUuids.size > 0) {
        // Get the first available UUID
        const uuid = this.preservedUuids.keys().next().value;
        element.setAttribute('data-line-uuid', uuid);
        restoredMap.setUuid(index, uuid);
        this.preservedUuids.delete(uuid);
      }
    });
    
    return restoredMap.toMap(); // Convert to standard Map
  }
  
  /**
   * Check if we have preserved UUIDs
   */
  hasPreservedUuids(): boolean {
    return this.preservedUuids.size > 0;
  }
  
  /**
   * Get the number of preserved UUIDs
   */
  get preservedCount(): number {
    return this.preservedUuids.size;
  }
}
