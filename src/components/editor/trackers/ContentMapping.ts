
/**
 * ContentMapping.ts - Handles mapping between content and UUIDs
 */

export class ContentMapping {
  private contentToUuid: Map<string, string> = new Map();
  private contentHistory: Map<string, string> = new Map();

  /**
   * Get UUID associated with content
   */
  getUuidByContent(content: string): string | undefined {
    return this.contentToUuid.get(content);
  }

  /**
   * Associate content with a UUID
   */
  mapContentToUuid(content: string, uuid: string): void {
    if (!content || !uuid || content.trim() === '') {
      return;
    }
    
    this.contentToUuid.set(content, uuid);
  }

  /**
   * Store historical content for a UUID
   */
  trackContentHistory(uuid: string, content: string): void {
    if (!uuid || !content) {
      return;
    }
    
    this.contentHistory.set(uuid, content);
  }

  /**
   * Get historical content for a UUID
   */
  getHistoricalContent(uuid: string): string | undefined {
    return this.contentHistory.get(uuid);
  }

  /**
   * Check if content has changed for a UUID
   */
  hasContentChanged(uuid: string, newContent: string): boolean {
    const previousContent = this.contentHistory.get(uuid);
    return previousContent !== undefined && previousContent !== newContent;
  }

  /**
   * Get the content-to-UUID map
   */
  getContentToUuidMap(): Map<string, string> {
    return this.contentToUuid;
  }

  /**
   * Clear all mappings
   */
  clear(): void {
    this.contentToUuid.clear();
    this.contentHistory.clear();
  }
}
