
/**
 * LinePositionInitializer.ts - Handles initialization of line position tracking
 */

import { DomUtils } from './DomUtils';

export class LinePositionInitializer {
  private lineUuidManager: any;
  private contentTracker: any;
  private quill: any = null;
  
  constructor(lineUuidManager: any, contentTracker: any) {
    this.lineUuidManager = lineUuidManager;
    this.contentTracker = contentTracker;
  }
  
  /**
   * Set quill instance
   */
  setQuill(quill: any): void {
    this.quill = quill;
  }
  
  /**
   * Initialize line position tracking
   */
  initialize(quill: any): void {
    console.log('**** LinePositionInitializer **** Initializing line position tracking');
    this.quill = quill;
    this.lineUuidManager.setQuill(quill);
    
    const lines = quill.getLines(0);
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          // Track in our line manager
          this.lineUuidManager.setLineUuid(index + 1, uuid);
          
          // Track content for content-based matching
          const content = DomUtils.getLineContent(line);
          if (content && content.trim() !== '') {
            this.contentTracker.trackInitialContent(line, uuid);
          }
          
          console.log(`**** LinePositionInitializer **** Mapped line ${index + 1} to UUID ${uuid}`);
        }
      }
    });
  }
}
