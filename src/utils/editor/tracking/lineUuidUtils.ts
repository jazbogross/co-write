
/**
 * Utilities for managing line UUIDs during editing operations
 */

/**
 * Map for storing line UUIDs by line index
 */
export class LineUuidMap {
  private uuidMap: Map<number, string> = new Map();
  
  /**
   * Get UUID for a line index
   */
  getUuid(lineIndex: number): string | undefined {
    return this.uuidMap.get(lineIndex);
  }
  
  /**
   * Set UUID for a line index
   */
  setUuid(lineIndex: number, uuid: string): void {
    this.uuidMap.set(lineIndex, uuid);
  }
  
  /**
   * Clear all UUID mappings
   */
  clear(): void {
    this.uuidMap.clear();
  }
  
  /**
   * Get all UUIDs as an array in line index order
   */
  getAllUuids(): string[] {
    const sorted = Array.from(this.uuidMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(entry => entry[1]);
    
    return sorted;
  }
  
  /**
   * Check if a line index has a UUID
   */
  hasUuid(lineIndex: number): boolean {
    return this.uuidMap.has(lineIndex);
  }
  
  /**
   * Get the map size
   */
  get size(): number {
    return this.uuidMap.size;
  }
  
  /**
   * Convert to a standard Map
   */
  toMap(): Map<number, string> {
    return new Map(this.uuidMap);
  }
  
  /**
   * Get entries
   */
  entries(): IterableIterator<[number, string]> {
    return this.uuidMap.entries();
  }
  
  /**
   * Delete entry
   */
  delete(lineIndex: number): boolean {
    return this.uuidMap.delete(lineIndex);
  }
  
  /**
   * ForEach method
   */
  forEach(callbackfn: (value: string, key: number, map: Map<number, string>) => void): void {
    this.uuidMap.forEach(callbackfn);
  }
}

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

/**
 * Ensures all lines have UUIDs, generating new ones as needed
 */
export const ensureAllLinesHaveUuids = (
  elements: HTMLElement[],
  getExistingUuid?: (lineIndex: number) => string | undefined
): void => {
  elements.forEach((element, index) => {
    if (!element.hasAttribute('data-line-uuid')) {
      let uuid: string;
      
      // Try to get UUID from existing data if provided
      if (getExistingUuid) {
        const existingUuid = getExistingUuid(index);
        if (existingUuid) {
          uuid = existingUuid;
        } else {
          uuid = crypto.randomUUID();
        }
      } else {
        uuid = crypto.randomUUID();
      }
      
      element.setAttribute('data-line-uuid', uuid);
    }
  });
};

/**
 * Generate a UUID for a new line
 */
export const generateLineUuid = (): string => {
  return crypto.randomUUID();
};

/**
 * Handle UUID assignment for line split operations
 */
export const handleLineSplit = (
  originalElement: HTMLElement,
  newElement: HTMLElement
): void => {
  // Original line keeps its UUID
  const originalUuid = originalElement.getAttribute('data-line-uuid');
  
  // New line gets a new UUID
  const newUuid = generateLineUuid();
  newElement.setAttribute('data-line-uuid', newUuid);
  
  // Log for debugging
  console.log(`Line split: Original UUID ${originalUuid}, new line UUID ${newUuid}`);
};

/**
 * Handle UUID assignment when lines are merged
 */
export const handleLineMerge = (
  remainingElement: HTMLElement,
  removedElementUuid: string
): void => {
  // The remaining element keeps its UUID
  const remainingUuid = remainingElement.getAttribute('data-line-uuid');
  
  // Log the merge for debugging
  console.log(`Line merge: Keeping UUID ${remainingUuid}, removed line UUID ${removedElementUuid}`);
};
