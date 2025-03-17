
/**
 * UuidValidator.ts - Validates and ensures uniqueness of UUIDs
 * Refactored into smaller, focused utility functions
 */

/**
 * Check if a line has a UUID
 */
const hasUuid = (line: any): boolean => {
  return line && line.domNode && line.domNode.hasAttribute('data-line-uuid');
};

/**
 * Get UUID from a line
 */
const getUuid = (line: any): string | null => {
  if (!hasUuid(line)) return null;
  return line.domNode.getAttribute('data-line-uuid');
};

/**
 * Find lines with duplicate UUIDs
 * Returns an array of line indices that have duplicate UUIDs
 */
const findDuplicateUuids = (lines: any[]): number[] => {
  const seenUuids = new Set<string>();
  const duplicates: number[] = [];
  
  lines.forEach((line, index) => {
    const uuid = getUuid(line);
    if (uuid) {
      if (seenUuids.has(uuid)) {
        duplicates.push(index);
      } else {
        seenUuids.add(uuid);
      }
    }
  });
  
  return duplicates;
};

/**
 * Generate a new UUID
 */
const generateUuid = (): string => {
  return crypto.randomUUID();
};

/**
 * Apply a new UUID to a line
 */
const applyUuid = (line: any, index: number, uuid: string): void => {
  if (!line || !line.domNode) return;
  
  line.domNode.setAttribute('data-line-uuid', uuid);
  line.domNode.setAttribute('data-line-index', String(index + 1));
  
  console.log(`**** UuidValidator **** Applied UUID ${uuid} to line ${index + 1}`);
};

/**
 * Fix duplicate UUIDs by assigning new UUIDs to duplicates
 */
const fixDuplicateUuids = (lines: any[], duplicateIndices: number[]): void => {
  if (duplicateIndices.length === 0) return;
  
  console.log(`**** UuidValidator **** Found ${duplicateIndices.length} lines with duplicate UUIDs, fixing...`);
  
  duplicateIndices.forEach(index => {
    const line = lines[index];
    const newUuid = generateUuid();
    applyUuid(line, index, newUuid);
    console.log(`**** UuidValidator **** Fixed duplicate UUID at line ${index + 1}, assigned new UUID: ${newUuid}`);
  });
};

/**
 * Main class for UUID validation operations
 */
export class UuidValidator {
  /**
   * Ensure all lines have unique UUIDs
   * Returns true if duplicates were found and fixed
   */
  public static ensureUniqueUuids(lines: any[]): boolean {
    const duplicates = findDuplicateUuids(lines);
    
    if (duplicates.length > 0) {
      fixDuplicateUuids(lines, duplicates);
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
    const newUuid = generateUuid();
    applyUuid(line, index, newUuid);
    
    return newUuid;
  }
  
  /**
   * Check if a line has a valid UUID
   */
  public static hasValidUuid(line: any): boolean {
    return hasUuid(line);
  }
  
  /**
   * Get the UUID from a line
   */
  public static getLineUuid(line: any): string | null {
    return getUuid(line);
  }
}
