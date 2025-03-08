
/**
 * LineContentTracker.ts - Tracks line content and maintains mapping between content and UUIDs
 */

import { ContentMapping } from './ContentMapping';
import { DomUtils } from './DomUtils';

export class LineContentTracker {
  private contentMapping: ContentMapping;
  
  constructor() {
    this.contentMapping = new ContentMapping();
  }
  
  /**
   * Track content changes for a line
   */
  trackLineContent(line: any, uuid: string): void {
    if (!line || !uuid) return;
    
    const content = DomUtils.getLineContent(line);
    if (content && content.trim() !== '') {
      // Track historical association so we can find lines that move
      this.contentMapping.trackContentHistory(uuid, content);
      
      // If content changed, update the content-to-UUID map
      if (this.contentMapping.hasContentChanged(uuid, content)) {
        this.contentMapping.mapContentToUuid(content, uuid);
      }
    }
  }
  
  /**
   * Try to find a UUID for content
   */
  findUuidByContent(content: string): string | undefined {
    if (!content || content.trim() === '') return undefined;
    return this.contentMapping.getUuidByContent(content);
  }
  
  /**
   * Get content-to-UUID map
   */
  getContentToUuidMap(): Map<string, string> {
    return this.contentMapping.getContentToUuidMap();
  }
  
  /**
   * Track initial content
   */
  trackInitialContent(line: any, uuid: string): void {
    if (!line || !uuid) return;
    
    const content = DomUtils.getLineContent(line);
    if (content && content.trim() !== '') {
      this.contentMapping.mapContentToUuid(content, uuid);
      this.contentMapping.trackContentHistory(uuid, content);
    }
  }
}
