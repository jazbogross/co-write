
/**
 * DomUtils.ts - Utility functions for DOM operations
 */

export class DomUtils {
  /**
   * Get content from a Quill line
   */
  static getLineContent(line: any): string {
    if (!line || !line.cache || !line.cache.delta || !line.cache.delta.ops) {
      return '';
    }
    
    return line.cache.delta.ops?.[0]?.insert || '';
  }
  
  /**
   * Count missing UUIDs in DOM elements
   */
  static countMissingUuids(lines: any[]): number {
    let missingCount = 0;
    
    lines.forEach((line: any) => {
      if (line.domNode && !line.domNode.getAttribute('data-line-uuid')) {
        missingCount++;
      }
    });
    
    return missingCount;
  }
  
  /**
   * Update line index attributes in the DOM
   */
  static updateLineIndices(lines: any[]): number {
    let updatedCount = 0;
    
    lines.forEach((line: any, index: number) => {
      if (!line.domNode) return;
      
      // Always update the index attribute to reflect the current position
      const oneBasedIndex = index + 1;
      const currentIndex = line.domNode.getAttribute('data-line-index');
      
      if (currentIndex !== String(oneBasedIndex)) {
        line.domNode.setAttribute('data-line-index', String(oneBasedIndex));
        line.domNode.setAttribute('line-number', String(oneBasedIndex));
        updatedCount++;
      }
      
      // Make sure line-number is set even if data-line-index is correct
      if (!line.domNode.hasAttribute('line-number')) {
        line.domNode.setAttribute('line-number', String(oneBasedIndex));
        updatedCount++;
      }
      
      // Make sure line-uuid is set if data-line-uuid exists
      const uuid = line.domNode.getAttribute('data-line-uuid');
      if (uuid && !line.domNode.hasAttribute('line-uuid')) {
        line.domNode.setAttribute('line-uuid', uuid);
        updatedCount++;
      }
    });
    
    return updatedCount;
  }
}
