
/**
 * LineContentCache.ts - Manages caching of line contents for change detection
 */

export class LineContentCache {
  private contentCache: Map<number, string> = new Map();
  
  /**
   * Cache line contents for better change detection
   */
  public cacheLineContents(lines: any[]): void {
    this.contentCache.clear();
    lines.forEach((line, index) => {
      const content = this.getLineContent(line);
      this.contentCache.set(index, content);
    });
  }
  
  /**
   * Get content from a line
   */
  public getLineContent(line: any): string {
    if (!line || !line.cache || !line.cache.delta || !line.cache.delta.ops) {
      return '';
    }
    return line.cache.delta.ops?.[0]?.insert || '';
  }
  
  /**
   * Get cached content for a line index
   */
  public getCachedContent(index: number): string | undefined {
    return this.contentCache.get(index);
  }
  
  /**
   * Check if a line has duplicated UUID with any other line
   */
  public checkForUuidDuplication(line: any, lines: any[]): boolean {
    if (!line || !line.domNode) return false;
    
    const lineUuid = line.domNode.getAttribute('data-line-uuid');
    if (!lineUuid) return false;
    
    let count = 0;
    lines.forEach((otherLine: any) => {
      if (otherLine.domNode && otherLine.domNode.getAttribute('data-line-uuid') === lineUuid) {
        count++;
      }
    });
    
    return count > 1; // Return true if this UUID appears more than once
  }
  
  /**
   * Clear the cache
   */
  public clear(): void {
    this.contentCache.clear();
  }
}
