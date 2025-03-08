
/**
 * Utilities for combining multiple Delta objects
 */
import { DeltaContent } from '../types';
import { isDeltaObject } from '../validation/deltaValidation';

/**
 * Combines multiple Delta contents into a single Delta
 */
export const combineDeltaContents = (deltaContents: (DeltaContent | string | null)[]): DeltaContent | null => {
  // Filter out nulls and invalid Deltas
  const validDeltaContents = deltaContents.filter(content => {
    if (!content) return false;
    
    // Allow strings - they'll be converted to Delta objects
    if (typeof content === 'string') return true;
    
    // Validate Delta objects
    return isDeltaObject(content);
  });
  
  if (validDeltaContents.length === 0) {
    return null;
  }
  
  // Start with an empty Delta
  const combinedDelta: DeltaContent = { ops: [] };
  
  // Process each Delta in order
  validDeltaContents.forEach(content => {
    // Convert string to simple insert Delta
    if (typeof content === 'string') {
      // Skip empty strings
      if (!content.trim()) return;
      
      // Create a simple Delta for this string
      const textDelta: DeltaContent = {
        ops: [{ insert: content }]
      };
      
      // Add a newline if it doesn't end with one
      if (!content.endsWith('\n')) {
        textDelta.ops.push({ insert: '\n' });
      }
      
      // Append to the combined Delta
      combinedDelta.ops = [...combinedDelta.ops, ...textDelta.ops];
      return;
    }
    
    // Process Delta objects
    if (isDeltaObject(content) && content.ops) {
      // Skip empty Deltas
      if (content.ops.length === 0) return;
      
      // Make sure the Delta ends with a newline if it's not the first one
      const lastOp = content.ops[content.ops.length - 1];
      const needsNewline = combinedDelta.ops.length > 0 && 
                           (!lastOp.insert || 
                            (typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')));
      
      // Append the ops
      combinedDelta.ops = [...combinedDelta.ops, ...content.ops];
      
      // Add newline if needed
      if (needsNewline) {
        combinedDelta.ops.push({ insert: '\n' });
      }
    }
  });
  
  // Ensure we have a valid combined Delta with content
  if (combinedDelta.ops.length === 0) {
    return null;
  }
  
  return combinedDelta;
};

/**
 * Adds a newline to the end of a Delta if needed
 */
export const ensureTrailingNewline = (delta: DeltaContent): DeltaContent => {
  if (!isDeltaObject(delta) || !delta.ops || delta.ops.length === 0) {
    return { ops: [{ insert: '\n' }] };
  }
  
  const lastOp = delta.ops[delta.ops.length - 1];
  if (lastOp.insert && typeof lastOp.insert === 'string' && lastOp.insert.endsWith('\n')) {
    // Already has a trailing newline
    return delta;
  }
  
  // Clone the Delta and add a newline
  return {
    ops: [...delta.ops, { insert: '\n' }]
  };
};
