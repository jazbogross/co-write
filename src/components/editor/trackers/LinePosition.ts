
/**
 * LinePosition.ts - Handles tracking of line positions and content
 */

export class LinePosition {
  private lineUuids: Map<number, string> = new Map();
  private contentToUuid: Map<string, string> = new Map();
  private contentHistory: Map<string, string> = new Map();
  private lastKnownLines: number = 0;

  // Initialize line position tracking
  initialize(quill: any): void {
    console.log('**** LinePosition **** Initializing line position tracking');
    
    const lines = quill.getLines(0);
    this.lastKnownLines = lines.length;
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          this.lineUuids.set(index, uuid);
          const content = this.getLineContent(line);
          
          // Track content in both directions
          this.contentToUuid.set(content, uuid);
          this.contentHistory.set(uuid, content);
          
          console.log(`**** LinePosition **** Mapped line ${index + 1} to UUID ${uuid}`);
        } else {
          // If no UUID exists, check if we have one in our map
          if (this.lineUuids.has(index)) {
            const existingUuid = this.lineUuids.get(index);
            line.domNode.setAttribute('data-line-uuid', existingUuid || '');
            console.log(`**** LinePosition **** Applied existing UUID ${existingUuid} to line ${index + 1}`);
          }
        }
      }
    });
  }

  // Get line content from a Quill line
  getLineContent(line: any): string {
    return line.cache?.delta?.ops?.[0]?.insert || '';
  }

  // Update line index attributes in the DOM
  updateLineIndexAttributes(quill: any, isProgrammaticUpdate: boolean = false): void {
    // Skip during programmatic updates
    if (isProgrammaticUpdate) {
      console.log('**** LinePosition **** Skipping line index attribute updates during programmatic update');
      return;
    }
    
    const lines = quill.getLines(0);
    let missingUuidCount = 0;
    
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      // Always update the index attribute to reflect the current position
      const oneBasedIndex = index + 1;
      const currentIndex = line.domNode.getAttribute('data-line-index');
      if (currentIndex !== String(oneBasedIndex)) {
        line.domNode.setAttribute('data-line-index', String(oneBasedIndex));
      }
      
      // Read the UUID from DOM and update our maps
      let uuid = line.domNode.getAttribute('data-line-uuid');
      
      // If UUID is missing, try to find one based on position or content
      if (!uuid) {
        missingUuidCount++;
        
        // Try to get UUID from our position map
        uuid = this.lineUuids.get(index);
        
        // If still no UUID, try content matching
        if (!uuid) {
          const content = this.getLineContent(line);
          if (content && content.trim() !== '') {
            uuid = this.contentToUuid.get(content);
          }
        }
        
        // Apply the UUID if we found one
        if (uuid) {
          line.domNode.setAttribute('data-line-uuid', uuid);
          console.log(`**** LinePosition **** Applied missing UUID ${uuid} to line ${index + 1}`);
        }
      }
      
      // Always update our tracking maps with the current state
      if (uuid) {
        const content = this.getLineContent(line);
        const previousContent = this.contentHistory.get(uuid);
        
        // Update our position-based map
        this.lineUuids.set(index, uuid);
        
        // Update content mapping if needed
        if (content && content.trim() !== '') {
          // Track historical association so we can find lines that move
          this.contentHistory.set(uuid, content);
          
          // If content changed, update the content-to-UUID map
          if (content !== previousContent) {
            this.contentToUuid.set(content, uuid);
          }
        }
      }
    });
    
    if (missingUuidCount > 0) {
      console.log(`**** LinePosition **** Found ${missingUuidCount} lines with missing UUIDs`);
    }
    
    // Detect if the UUID is missing on any line and try to find it based on content
    lines.forEach((line: any, index: number) => {
      if (!line.domNode || line.domNode.getAttribute('data-line-uuid')) return;
      
      const content = this.getLineContent(line);
      if (content && content.trim() !== '') {
        const uuid = this.contentToUuid.get(content);
        if (uuid) {
          console.log(`**** LinePosition **** Restoring UUID for moved content at line ${index + 1}`);
          line.domNode.setAttribute('data-line-uuid', uuid);
          this.lineUuids.set(index, uuid);
        }
      }
    });
  }

  // Detect changes in line count
  detectLineCountChanges(quill: any, isProgrammaticUpdate: boolean = false): void {
    // Skip during programmatic updates
    if (isProgrammaticUpdate) {
      console.log('**** LinePosition **** Skipping line count change detection during programmatic update');
      return;
    }
    
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
    const zeroBasedIndex = oneBasedIndex - 1;
    return this.lineUuids.get(zeroBasedIndex);
  }

  // Set UUID for a line by index
  setLineUuid(oneBasedIndex: number, uuid: string, quill: any): void {
    const zeroBasedIndex = oneBasedIndex - 1;
    this.lineUuids.set(zeroBasedIndex, uuid);
    
    // Update the DOM element if it exists
    const lines = quill.getLines(0);
    if (lines[zeroBasedIndex] && lines[zeroBasedIndex].domNode) {
      lines[zeroBasedIndex].domNode.setAttribute('data-line-uuid', uuid);
      
      // Also update content mapping
      const content = this.getLineContent(lines[zeroBasedIndex]);
      if (content && content.trim() !== '') {
        this.contentToUuid.set(content, uuid);
        this.contentHistory.set(uuid, content);
      }
    }
  }

  // Get content to UUID map
  getContentToUuidMap(): Map<string, string> {
    return this.contentToUuid;
  }

  // Get DOM UUID map - Modified to not require quill parameter
  getDomUuidMap(quill: any): Map<number, string> {
    const map = new Map<number, string>();
    const lines = quill.getLines(0);
    
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          map.set(index, uuid);
        }
      }
    });
    
    return map;
  }
}
