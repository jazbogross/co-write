/**
 * UuidPreservationService.ts - Handles preserving and restoring line UUIDs during text changes
 */

export class UuidPreservationService {
  private preservedUuids: Map<number, string> = new Map();
  private preservedContentMap: Map<string, string> = new Map(); // Content hash to UUID mapping
  private quill: any;

  constructor(quill: any) {
    this.quill = quill;
    console.log('🔍 UuidPreservationService initialized');
  }

  /**
   * Preserve line UUIDs before text changes
   * Uses both position-based and content-based preservation
   */
  preserveLineUuids(): void {
    console.log('🔍 UuidPreservationService preserving line UUIDs');
    this.preservedUuids.clear();
    this.preservedContentMap.clear();

    const lines = this.quill.getLines();
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          // Store by position for direct restoration
          this.preservedUuids.set(index, uuid);
          
          // Also store by content hash for content-based matching
          // This helps with lines that moved during the operation
          const contentHash = this.getContentHashForLine(line);
          if (contentHash) {
            this.preservedContentMap.set(contentHash, uuid);
          }
          
          console.log(`🔍 Preserved UUID for line ${index + 1}: ${uuid}`);
        }
      }
    });
  }

  /**
   * Get a simple content hash for a line
   */
  private getContentHashForLine(line: any): string | null {
    // Extract content from line's delta cache
    if (!line || !line.cache || !line.cache.delta || !line.cache.delta.ops) {
      return null;
    }
    
    const content = line.cache.delta.ops[0]?.insert || '';
    if (!content || typeof content !== 'string') {
      return null;
    }
    
    // For simple content, just use the content string directly
    // For complex content, a more sophisticated hashing might be needed
    return content.trim();
  }

  /**
   * Restore line UUIDs after text changes
   * Uses both position-based and content-based restoration
   */
  restoreLineUuids(): void {
    console.log('🔍 UuidPreservationService restoring line UUIDs');

    const lines = this.quill.getLines();
    let restoredCount = 0;
    let contentMatchCount = 0;

    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      // First try position-based restoration (for unchanged lines)
      if (this.preservedUuids.has(index)) {
        const uuid = this.preservedUuids.get(index);
        if (uuid) {
          line.domNode.setAttribute('data-line-uuid', uuid);
          line.domNode.setAttribute('data-line-index', (index + 1).toString());
          restoredCount++;
        }
      } 
      // If no position match, try content-based matching (for moved lines)
      else {
        const contentHash = this.getContentHashForLine(line);
        if (contentHash && this.preservedContentMap.has(contentHash)) {
          const uuid = this.preservedContentMap.get(contentHash);
          if (uuid) {
            // Don't overwrite existing UUIDs
            const currentUuid = line.domNode.getAttribute('data-line-uuid');
            if (!currentUuid) {
              line.domNode.setAttribute('data-line-uuid', uuid);
              line.domNode.setAttribute('data-line-index', (index + 1).toString());
              contentMatchCount++;
            }
          }
        }
      }
    });

    console.log(`🔍 UuidPreservationService restored ${restoredCount} line UUIDs by position and ${contentMatchCount} by content`);
  }
  
  /**
   * Ensure all lines have UUIDs
   * @param getLineUuid Function to retrieve a UUID for a specific line index
   */
  ensureAllLinesHaveUuids(getLineUuid: (index: number) => string | undefined): void {
    console.log('🔍 UuidPreservationService ensuring all lines have UUIDs');
    
    const lines = this.quill.getLines();
    let missingCount = 0;
    let assignedCount = 0;
    
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      // Check if line needs a UUID
      if (!line.domNode.getAttribute('data-line-uuid')) {
        missingCount++;
        
        // Try to get UUID from tracking service
        const uuid = getLineUuid(index + 1);
        
        if (uuid) {
          // Use tracked UUID if available
          line.domNode.setAttribute('data-line-uuid', uuid);
          assignedCount++;
          console.log(`🔍 UuidPreservationService assigned tracked UUID ${uuid} to line ${index + 1}`);
        } else {
          // Generate a new UUID if no existing UUID is found
          const newUuid = crypto.randomUUID();
          line.domNode.setAttribute('data-line-uuid', newUuid);
          assignedCount++;
          console.log(`🔍 UuidPreservationService generated new UUID ${newUuid} for line ${index + 1}`);
        }
      }
      
      // Always update the line index attribute
      line.domNode.setAttribute('data-line-index', (index + 1).toString());
    });
    
    if (missingCount > 0) {
      console.log(`🔍 UuidPreservationService found ${missingCount} lines without UUIDs, assigned ${assignedCount}`);
    }
  }

  /**
   * Check if there are any preserved UUIDs
   */
  hasPreservedUuids(): boolean {
    return this.preservedUuids.size > 0;
  }
}
