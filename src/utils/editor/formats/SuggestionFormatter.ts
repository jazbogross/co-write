
import { DeltaContent } from '../types';
import { DiffChange } from '@/utils/diff';
import Delta from 'quill-delta';
import { DeltaOp } from '../types';

/**
 * Format Delta content with suggestion highlights
 */
export class SuggestionFormatter {
  /**
   * Create a Delta that shows additions, deletions, and modifications
   */
  static createComparisonDelta(
    originalContent: string,
    suggestedContent: string,
    diffChanges: DiffChange[]
  ): DeltaContent {
    // If no changes, return original content
    if (diffChanges.length === 0) {
      return { ops: [{ insert: originalContent }] };
    }
    
    // First, create a map of changes by line index
    const lineMap: Map<number, DiffChange[]> = new Map();
    
    // Group changes by line
    diffChanges.forEach(change => {
      const lineIdx = change.originalLineNumber ? change.originalLineNumber - 1 : 0;
      if (!lineMap.has(lineIdx)) {
        lineMap.set(lineIdx, []);
      }
      lineMap.get(lineIdx)?.push(change);
    });
    
    // Split content into lines
    const originalLines = originalContent.split('\n');
    const suggestedLines = suggestedContent.split('\n');
    
    // Create a new delta
    const delta = new Delta();
    
    // Track the current position in both texts
    let originalLineIdx = 0;
    let suggestedLineIdx = 0;
    
    // Process lines until we reach the end of both texts
    while (originalLineIdx < originalLines.length || suggestedLineIdx < suggestedLines.length) {
      const originalLine = originalLineIdx < originalLines.length ? originalLines[originalLineIdx] : '';
      const suggestedLine = suggestedLineIdx < suggestedLines.length ? suggestedLines[suggestedLineIdx] : '';
      
      // Check if this line has changes
      const changesAtLine = lineMap.get(originalLineIdx) || [];
      
      if (changesAtLine.length > 0) {
        // Process each change type
        const hasAddition = changesAtLine.some(c => c.type === 'add');
        const hasDeletion = changesAtLine.some(c => c.type === 'delete');
        const hasModification = changesAtLine.some(c => c.type === 'modify');
        
        if (hasDeletion) {
          // Show deletion
          delta.insert(originalLine, { 'suggestion-deletion': true });
          delta.insert('\n');
          originalLineIdx++;
        }
        
        if (hasAddition) {
          // Show addition
          delta.insert(suggestedLine, { 'suggestion-addition': true });
          delta.insert('\n');
          suggestedLineIdx++;
        } else if (hasModification && !hasDeletion) {
          // Show modification (already handled deletion above)
          delta.insert(suggestedLine, { 'suggestion-addition': true });
          delta.insert('\n');
          originalLineIdx++;
          suggestedLineIdx++;
        }
      } else {
        // No changes, add equal line
        if (originalLineIdx < originalLines.length) {
          delta.insert(originalLine);
          delta.insert('\n');
          originalLineIdx++;
          suggestedLineIdx++;
        }
      }
    }
    
    // Convert Delta ops to DeltaOp[] type
    const deltaOps = delta.ops.map(op => {
      const newOp: DeltaOp = {};
      
      if ('insert' in op) {
        newOp.insert = op.insert;
      }
      
      if ('delete' in op) {
        newOp.delete = typeof op.delete === 'number' ? op.delete : 0;
      }
      
      if ('retain' in op) {
        newOp.retain = typeof op.retain === 'number' ? op.retain : 0;
      }
      
      if ('attributes' in op) {
        newOp.attributes = op.attributes;
      }
      
      return newOp;
    });
    
    // Return the proper DeltaContent format
    return { ops: deltaOps };
  }
}
