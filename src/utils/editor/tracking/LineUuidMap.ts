
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
