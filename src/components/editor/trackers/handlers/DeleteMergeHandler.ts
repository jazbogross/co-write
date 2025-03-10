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
    
    // Store the UUIDs before deletion/merge
    const lineUuids: string[] = [];
    lines.forEach((line: any) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        lineUuids.push(uuid || '');
      }
    });
    
    // For backspace at position 0 (line merge), we want to:
    // 1. Preserve the UUID of the line receiving the content (the previous line)
    // 2. NOT inherit the UUID of the line that's being merged into the previous line
    
    // Get cursor position to identify merge vs. delete
    const selection = quill.getSelection();
    if (selection && selection.index === 0 && selection.length === 0) {
      console.log(`**** DeleteMergeHandler **** Detected backspace at position 0, handling special merge case`);
      
      // This is likely a backspace at position 0, which merges the current line with the previous line
      // Find the current line index
      const currentLineIndex = quill.getLines(selection.index, 1)[0]?.index || 0;
      
      if (currentLineIndex > 0) {
        // The target line (that receives content) is the previous line
        const targetLineIndex = currentLineIndex - 1;
        if (targetLineIndex >= 0 && targetLineIndex < lines.length) {
          // Ensure the target line keeps its UUID after merge
          setTimeout(() => {
            const updatedLines = quill.getLines(0);
            if (targetLineIndex < updatedLines.length && updatedLines[targetLineIndex].domNode) {
              const originalUuid = lineUuids[targetLineIndex];
              if (originalUuid) {
                const currentUuid = updatedLines[targetLineIndex].domNode.getAttribute('data-line-uuid');
                
                if (currentUuid !== originalUuid) {
                  console.log(`**** DeleteMergeHandler **** Restoring original UUID ${originalUuid} to merged line`);
                  updatedLines[targetLineIndex].domNode.setAttribute('data-line-uuid', originalUuid);
                }
              }
            }
          }, 0);
        }
      }
    }
    
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
