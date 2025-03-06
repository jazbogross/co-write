/**
 * SuggestionFormatter.ts - Applies diff-based suggestion formats to Quill content
 */
import { DiffOperation, DiffChange } from '@/utils/diff';
import { DeltaContent, DeltaOp } from '@/utils/editor/types';
import { FORMATS } from './SuggestionFormat';

export class SuggestionFormatter {
  /**
   * Apply suggestion formats to a Delta based on diff information
   */
  static applyFormatsToDeltas(
    delta: DeltaContent, 
    diff: DiffChange[]
  ): DeltaContent {
    if (!delta || !diff || diff.length === 0 || !delta.ops) {
      return delta;
    }
    
    // Make a deep copy to avoid modifying the original
    const formattedDelta = JSON.parse(JSON.stringify(delta)) as DeltaContent;
    let currentIndex = 0;
    
    // Process each operation in the delta
    for (let i = 0; i < formattedDelta.ops.length; i++) {
      const op = formattedDelta.ops[i];
      
      // Only process insert operations that contain text
      if (op.insert && typeof op.insert === 'string') {
        const textLength = op.insert.length;
        
        // Find all diffs that apply to this text segment
        const relevantDiffs = diff.filter(d => {
          const diffStart = d.index;
          const diffEnd = d.index + (d.type === 'delete' ? 0 : d.text.length);
          const opStart = currentIndex;
          const opEnd = currentIndex + textLength;
          
          return (diffStart < opEnd && diffEnd > opStart);
        });
        
        // Apply formats for each relevant diff
        if (relevantDiffs.length > 0) {
          this.applyFormatsToOp(op, relevantDiffs, currentIndex);
        }
        
        currentIndex += textLength;
      } else if (op.insert) {
        // For non-text inserts (like images), simply increment the index
        currentIndex += 1;
      }
    }
    
    return formattedDelta;
  }
  
  /**
   * Apply formats to a specific delta operation
   */
  private static applyFormatsToOp(
    op: DeltaOp, 
    diffs: DiffChange[], 
    baseIndex: number
  ): void {
    // Initialize attributes if they don't exist
    if (!op.attributes) {
      op.attributes = {};
    }
    
    // Simple case: apply to the entire operation
    if (diffs.length === 1 && diffs[0].index === baseIndex && 
        diffs[0].text === op.insert) {
      this.applyFormatToOp(op, diffs[0].type);
      return;
    }
    
    // Complex case: we need to split the operation for partial formatting
    // This would require replacing the current op with multiple ops
    // For simplicity in this implementation, we'll just mark the whole op
    // In a full implementation, this would split ops at diff boundaries
    
    // Check if we have any additions
    if (diffs.some(d => d.type === 'add')) {
      this.applyFormatToOp(op, 'add');
    } 
    // Check if we have any deletions
    else if (diffs.some(d => d.type === 'delete')) {
      this.applyFormatToOp(op, 'delete');
    }
    // Otherwise mark as modified
    else {
      this.applyFormatToOp(op, 'modify');
    }
  }
  
  /**
   * Apply the appropriate format based on the diff type
   */
  private static applyFormatToOp(op: DeltaOp, diffType: DiffOperation): void {
    switch (diffType) {
      case 'add':
        op.attributes![FORMATS.ADDITION] = true;
        break;
      case 'delete':
        op.attributes![FORMATS.DELETION] = true;
        break;
      case 'modify':
        op.attributes![FORMATS.MODIFIED] = true;
        break;
    }
  }
  
  /**
   * Create a delta that shows both original and suggested content with formats
   */
  static createComparisonDelta(
    originalContent: string, 
    suggestedContent: string, 
    diff: DiffChange[]
  ): DeltaContent {
    const delta: DeltaContent = { ops: [] };
    
    // Simple implementation - in a full solution, this would create a
    // properly formatted diff view showing both original and changes
    diff.forEach(change => {
      switch (change.type) {
        case 'add':
          delta.ops!.push({
            insert: change.text,
            attributes: { [FORMATS.ADDITION]: true }
          });
          break;
        case 'delete':
          // For deletions, we show the content that was removed
          delta.ops!.push({
            insert: change.text,
            attributes: { [FORMATS.DELETION]: true }
          });
          break;
        case 'equal':
          delta.ops!.push({ insert: change.text });
          break;
        case 'modify':
          // For modifications, show both versions
          delta.ops!.push({
            insert: change.originalText || '',
            attributes: { [FORMATS.DELETION]: true }
          });
          delta.ops!.push({
            insert: change.text,
            attributes: { [FORMATS.ADDITION]: true }
          });
          break;
      }
    });
    
    // End with a newline
    delta.ops!.push({ insert: '\n' });
    
    return delta;
  }
}
