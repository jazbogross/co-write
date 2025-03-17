
/**
 * LineAttributeUpdater.ts - Handles updating line attributes in the DOM
 */

import { DomUtils } from './DomUtils';

export class LineAttributeUpdater {
  private lineUuidManager: any;
  private contentTracker: any;
  
  constructor(lineUuidManager: any, contentTracker: any) {
    this.lineUuidManager = lineUuidManager;
    this.contentTracker = contentTracker;
  }
  
  /**
   * Update line index attributes in the DOM
   */
  updateLineIndexAttributes(quill: any, isProgrammaticUpdate: boolean = false): void {
    // Skip during programmatic updates
    if (isProgrammaticUpdate) {
      console.log('**** LineAttributeUpdater **** Skipping line index attribute updates during programmatic update');
      return;
    }
    
    if (!quill) return;
    
    const lines = quill.getLines(0);
    let missingUuidCount = 0;
    
    // Update all line indices
    DomUtils.updateLineIndices(lines);
    
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      // Read the UUID from DOM and update our maps
      let uuid = line.domNode.getAttribute('data-line-uuid');
      
      // If UUID is missing, try to find one based on position or content
      if (!uuid) {
        missingUuidCount++;
        
        // Try to get UUID from our position map
        uuid = this.lineUuidManager.getLineUuid(index + 1);
        
        // If still no UUID, try content matching
        if (!uuid) {
          const content = DomUtils.getLineContent(line);
          if (content && content.trim() !== '') {
            uuid = this.contentTracker.findUuidByContent(content);
          }
        }
        
        // Apply the UUID if we found one
        if (uuid) {
          line.domNode.setAttribute('data-line-uuid', uuid);
          line.domNode.setAttribute('line-uuid', uuid);
          line.domNode.setAttribute('data-line-index', String(index + 1));
          line.domNode.setAttribute('line-number', String(index + 1));
          console.log(`**** LineAttributeUpdater **** Applied missing UUID ${uuid} to line ${index + 1}`);
        }
      } else {
        // Ensure line-uuid attribute is also set
        if (!line.domNode.hasAttribute('line-uuid')) {
          line.domNode.setAttribute('line-uuid', uuid);
        }
        
        // Ensure line-number attribute is set
        if (!line.domNode.hasAttribute('line-number')) {
          line.domNode.setAttribute('line-number', String(index + 1));
        }
      }
      
      // Always update our tracking maps with the current state
      if (uuid) {
        // Update position-based map
        this.lineUuidManager.setLineUuid(index + 1, uuid);
        
        // Track content changes
        this.contentTracker.trackLineContent(line, uuid);
      }
    });
    
    if (missingUuidCount > 0) {
      console.log(`**** LineAttributeUpdater **** Found ${missingUuidCount} lines with missing UUIDs`);
    }
  }
}
