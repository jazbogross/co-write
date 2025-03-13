
import { DeltaContent } from '../types';
import { DiffChange } from '@/utils/diff';

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
    const ops: any[] = [];
    
    // Simple implementation that converts diff changes to Delta ops
    diffChanges.forEach(change => {
      if (change.type === 'add') {
        ops.push({
          insert: change.text,
          attributes: { 'suggestion-addition': true }
        });
      } else if (change.type === 'delete') {
        ops.push({
          insert: change.originalText || '',
          attributes: { 'suggestion-deletion': true }
        });
      } else if (change.type === 'modify') {
        // For modifications, show both the original and new text
        if (change.originalText) {
          ops.push({
            insert: change.originalText,
            attributes: { 'suggestion-deletion': true }
          });
        }
        ops.push({
          insert: change.text,
          attributes: { 'suggestion-addition': true }
        });
      } else {
        // Equal content
        ops.push({ insert: change.text });
      }
    });
    
    // Ensure the Delta ends with a newline
    if (ops.length === 0 || 
        (ops[ops.length - 1].insert && 
         typeof ops[ops.length - 1].insert === 'string' && 
         !ops[ops.length - 1].insert.endsWith('\n'))) {
      ops.push({ insert: '\n' });
    }
    
    return { ops };
  }
}
