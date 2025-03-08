
/**
 * UuidPreservationService.ts - Handles preserving and restoring line UUIDs during text changes
 */
import { v4 as uuidv4 } from 'uuid';

export class UuidPreservationService {
  private preservedUuids: Map<number, string> = new Map();
  private quill: any;

  constructor(quill: any) {
    this.quill = quill;
    console.log('🔍 UuidPreservationService initialized');
  }

  /**
   * Preserve line UUIDs before text changes
   */
  preserveLineUuids(): void {
    console.log('🔍 UuidPreservationService preserving line UUIDs');
    this.preservedUuids.clear();

    const lines = this.quill.getLines();
    lines.forEach((line: any, index: number) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          this.preservedUuids.set(index, uuid);
          console.log(`🔍 Preserved UUID for line ${index + 1}: ${uuid}`);
        }
      }
    });
  }

  /**
   * Restore line UUIDs after text changes
   */
  restoreLineUuids(): void {
    console.log('🔍 UuidPreservationService restoring line UUIDs');

    const lines = this.quill.getLines();
    let restoredCount = 0;

    lines.forEach((line: any, index: number) => {
      if (line.domNode && this.preservedUuids.has(index)) {
        const uuid = this.preservedUuids.get(index);
        if (uuid) {
          line.domNode.setAttribute('data-line-uuid', uuid);
          line.domNode.setAttribute('data-line-index', (index + 1).toString());
          restoredCount++;
        }
      }
    });

    console.log(`🔍 UuidPreservationService restored ${restoredCount} line UUIDs`);
  }
  
  /**
   * Check if we have preserved UUIDs
   */
  hasPreservedUuids(): boolean {
    return this.preservedUuids.size > 0;
  }
  
  /**
   * Ensure all lines have UUIDs, generating new ones as needed
   * @param getLineUuid Function to get an existing UUID for a line
   */
  ensureAllLinesHaveUuids(getLineUuid: (oneBasedIndex: number) => string | undefined): void {
    console.log('🔍 UuidPreservationService ensuring all lines have UUIDs');
    
    const lines = this.quill.getLines();
    let missingCount = 0;
    let assignedCount = 0;
    
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      const currentUuid = line.domNode.getAttribute('data-line-uuid');
      if (!currentUuid) {
        missingCount++;
        
        // Try to get UUID from the provided function
        const existingUuid = getLineUuid(index + 1);
        
        if (existingUuid) {
          // Use existing UUID
          line.domNode.setAttribute('data-line-uuid', existingUuid);
          assignedCount++;
        } else {
          // Generate a new UUID if no existing one is found
          const newUuid = uuidv4();
          line.domNode.setAttribute('data-line-uuid', newUuid);
          assignedCount++;
        }
        
        // Set the line index
        line.domNode.setAttribute('data-line-index', (index + 1).toString());
      }
    });
    
    console.log(`🔍 UuidPreservationService found ${missingCount} lines without UUIDs, assigned ${assignedCount}`);
  }
}
