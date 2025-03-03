
/**
 * LinePosition.ts - Handles tracking of line positions and content
 * Now refactored to use smaller, focused utility classes
 */

import { ContentMapping } from './ContentMapping';
import { LineUuidManager } from './LineUuidManager';
import { DomUtils } from './DomUtils';

export class LinePosition {
  private lineUuidManager = new LineUuidManager();
  private contentMapping = new ContentMapping();
  private lastKnownLines: number = 0;
  private quill: any = null;

  // Initialize line position tracking
  initialize(quill: any): void {
    console.log('**** LinePosition **** Initializing line position tracking');
    this.quill = quill;
    this.lineUuidManager.setQuill(quill);
    
    const lines = quill.getLines(0);
    this.lastKnownLines = lines.length;
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          // Track in our line manager
          this.lineUuidManager.setLineUuid(index + 1, uuid);
          
          // Track content in both directions
          const content = DomUtils.getLineContent(line);
          if (content && content.trim() !== '') {
            this.contentMapping.mapContentToUuid(content, uuid);
            this.contentMapping.trackContentHistory(uuid, content);
          }
          
          console.log(`**** LinePosition **** Mapped line ${index + 1} to UUID ${uuid}`);
        }
      }
    });
    
    // Check for missing UUIDs after initialization
    this.checkForMissingUuids();
  }

  // Check for and report missing UUIDs
  checkForMissingUuids(): void {
    if (!this.quill) return;
    
    const lines = this.quill.getLines(0);
    const missingCount = DomUtils.countMissingUuids(lines);
    
    if (missingCount > 0) {
      console.log(`**** LinePosition **** Found ${missingCount} lines with missing UUIDs`);
    }
  }

  // Update line index attributes in the DOM
  updateLineIndexAttributes(quill: any, isProgrammaticUpdate: boolean = false): void {
    // Skip during programmatic updates
    if (isProgrammaticUpdate) {
      console.log('**** LinePosition **** Skipping line index attribute updates during programmatic update');
      return;
    }
    
    this.quill = quill;
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
            uuid = this.contentMapping.getUuidByContent(content);
          }
        }
        
        // Apply the UUID if we found one
        if (uuid) {
          line.domNode.setAttribute('data-line-uuid', uuid);
          line.domNode.setAttribute('data-line-index', String(index + 1));
          console.log(`**** LinePosition **** Applied missing UUID ${uuid} to line ${index + 1}`);
        }
      }
      
      // Always update our tracking maps with the current state
      if (uuid) {
        const content = DomUtils.getLineContent(line);
        
        // Update our position-based map
        this.lineUuidManager.setLineUuid(index + 1, uuid);
        
        // Update content mapping if needed
        if (content && content.trim() !== '') {
          // Track historical association so we can find lines that move
          this.contentMapping.trackContentHistory(uuid, content);
          
          // If content changed, update the content-to-UUID map
          if (this.contentMapping.hasContentChanged(uuid, content)) {
            this.contentMapping.mapContentToUuid(content, uuid);
          }
        }
      }
    });
    
    if (missingUuidCount > 0) {
      console.log(`**** LinePosition **** Found ${missingUuidCount} lines with missing UUIDs`);
    }
  }

  // Apply UUIDs from an external data source to the DOM
  applyLineDataUuids(lineData: any[]): number {
    return this.lineUuidManager.applyUuidsToDOM(lineData, this.quill);
  }

  // Detect changes in line count
  detectLineCountChanges(quill: any, isProgrammaticUpdate: boolean = false): void {
    // Skip during programmatic updates
    if (isProgrammaticUpdate) {
      console.log('**** LinePosition **** Skipping line count change detection during programmatic update');
      return;
    }
    
    this.quill = quill;
    const lines = quill.getLines(0);
    const currentLineCount = lines.length;
    
    if (currentLineCount !== this.lastKnownLines) {
      console.log(`**** LinePosition **** Line count changed: ${this.lastKnownLines} -> ${currentLineCount}`);
      
      // Simple detection of line insertion/deletion
      if (currentLineCount > this.lastKnownLines) {
        console.log(`**** LinePosition **** Lines inserted: ${currentLineCount - this.lastKnownLines}`);
      } else {
        console.log(`**** LinePosition **** Lines deleted: ${this.lastKnownLines - currentLineCount}`);
      }
      
      this.lastKnownLines = currentLineCount;
    }
  }

  // Get UUID for a line by index
  getLineUuid(oneBasedIndex: number): string | undefined {
    return this.lineUuidManager.getLineUuid(oneBasedIndex);
  }

  // Set UUID for a line by index
  setLineUuid(oneBasedIndex: number, uuid: string, quill: any): void {
    this.lineUuidManager.setLineUuid(oneBasedIndex, uuid, quill);
    this.quill = quill;
  }

  // Get content to UUID map
  getContentToUuidMap(): Map<string, string> {
    return this.contentMapping.getContentToUuidMap();
  }

  // Get DOM UUID map - Modified to not require quill parameter
  getDomUuidMap(quill?: any): Map<number, string> {
    return this.lineUuidManager.getDomUuidMap(quill || this.quill);
  }

  // Explicitly refresh all UUIDs from lineData
  refreshLineUuids(lineData: any[]): void {
    if (!this.quill || !lineData || lineData.length === 0) {
      console.log('**** LinePosition **** Cannot refresh UUIDs, missing quill or lineData');
      return;
    }
    
    console.log(`**** LinePosition **** Refreshing all UUIDs for ${lineData.length} lines`);
    const applyCount = this.applyLineDataUuids(lineData);
    console.log(`**** LinePosition **** UUID refresh complete, applied ${applyCount} UUIDs`);
  }
}
