
/**
 * changeDetection.ts - Utilities for detecting specific types of changes
 */
import { isDeltaObject } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Detect formatting changes in a Delta object
 * This requires more complex logic to compare Delta attributes
 */
export function detectFormattingChanges(original: any, suggested: any): boolean {
  // Simple string content doesn't have formatting
  if (typeof original === 'string' && typeof suggested === 'string') {
    return false;
  }
  
  // If one is Delta and other is string, format definitely changed
  if ((isDeltaObject(original) && typeof suggested === 'string') ||
      (typeof original === 'string' && isDeltaObject(suggested))) {
    return true;
  }
  
  // If both are Deltas, we need to compare attributes
  if (isDeltaObject(original) && isDeltaObject(suggested)) {
    // This is a simplified check - a real implementation would need to compare 
    // attributes across operations more carefully
    const originalDelta = original as DeltaContent;
    const suggestedDelta = suggested as DeltaContent;
    
    if (!originalDelta.ops || !suggestedDelta.ops) return false;
    
    // Simple check: compare ops length
    if (originalDelta.ops.length !== suggestedDelta.ops.length) {
      return true;
    }
    
    // Compare attributes on each op
    for (let i = 0; i < originalDelta.ops.length; i++) {
      const origOp = originalDelta.ops[i];
      const suggOp = suggestedDelta.ops[i];
      
      // If inserts differ, content changed (not just formatting)
      if (typeof origOp.insert === 'string' && 
          typeof suggOp.insert === 'string' && 
          origOp.insert !== suggOp.insert) {
        continue;
      }
      
      // Check if attributes differ
      const origAttrs = JSON.stringify(origOp.attributes || {});
      const suggAttrs = JSON.stringify(suggOp.attributes || {});
      
      if (origAttrs !== suggAttrs) {
        return true;
      }
    }
  }
  
  return false;
}
