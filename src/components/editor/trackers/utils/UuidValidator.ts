/**
 * UuidValidator.ts - Validates and ensures uniqueness of UUIDs
 */

export class UuidValidator {
  /**
   * Ensure all lines have unique UUIDs
   * Returns true if duplicates were found and fixed
   */
  public static ensureUniqueUuids(lines: any[]): boolean {
    const seenUuids = new Set<string>();
    const duplicates: number[] = [];
    
    // First pass: detect duplicates
    lines.forEach((line, index) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        if (uuid) {
          if (seenUuids.has(uuid)) {
            duplicates.push(index);
          } else {
            seenUuids.add(uuid);
          }
        }
      }
    });
    
    // Second pass: fix duplicates
    if (duplicates.length > 0) {
      console.log(`**** UuidValidator **** Found ${duplicates.length} lines with duplicate UUIDs, fixing...`);
      
      duplicates.forEach(index => {
        const line = lines[index];
        if (line && line.domNode) {
          const newUuid = crypto.randomUUID();
          line.domNode.setAttribute('data-line-uuid', newUuid);
          line.domNode.setAttribute('data-line-index', String(index + 1));
          console.log(`**** UuidValidator **** Fixed duplicate UUID at line ${index + 1}, assigned new UUID: ${newUuid}`);
        }
      });
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Generate and assign a new UUID to a line
   */
  public static assignNewUuid(line: any, index: number): string | null {
    if (!line || !line.domNode) return null;
    
    // Explicitly clear any inherited UUID to ensure we don't keep an old one
    line.domNode.removeAttribute('data-line-uuid');
    
    // Generate and assign a new UUID
    const newUuid = crypto.randomUUID();
    line.domNode.setAttribute('data-line-uuid', newUuid);
    line.domNode.setAttribute('data-line-index', String(index + 1));
    console.log(`**** UuidValidator **** Assigned new UUID ${newUuid} to line ${index + 1}`);
    
    return newUuid;
  }
}
