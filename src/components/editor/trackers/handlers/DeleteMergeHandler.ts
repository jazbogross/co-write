
/**
 * DeleteMergeHandler.ts - Handles line deletion and merge operations
 */

export class DeleteMergeHandler {
  /**
   * Handle deletion or merge operations by completely preserving existing UUIDs
   * This ensures cursor position line doesn't get a new UUID after deletion
   */
  public static handleDeleteOrMerge(quill: any, linePosition: any): void {
    console.log(`**** DeleteMergeHandler **** Handling delete/merge, preserving all UUIDs`);
    
    const lines = quill.getLines(0);
    
    // For delete operations, we mainly want to preserve existing UUIDs and
    // NOT generate new ones for the remaining lines
    
    // Update line indices to reflect the new positions
    linePosition.updateLineIndexAttributes(quill, false);
    
    // Log the current UUIDs to verify they're preserved
    if (lines.length > 0) {
      console.log('**** DeleteMergeHandler **** UUIDs after delete/merge:');
      lines.forEach((line: any, index: number) => {
        if (line.domNode) {
          const uuid = line.domNode.getAttribute('data-line-uuid');
          console.log(`**** Line ${index + 1} UUID: ${uuid || 'missing'}`);
        }
      });
    }
  }
}
