
/**
 * Utilities for combining and manipulating Delta content
 */
import { DeltaContent, DeltaOp } from '../types';
import { validateDelta } from '../validation/deltaValidation';
import { createEmptyDelta } from './deltaOperations';

/**
 * Safely combines multiple Delta objects or stringified Deltas
 * Returns null if any content is invalid
 */
export const combineDeltaContents = (contents: any[]): DeltaContent | null => {
  console.log('🔶 combineDeltaContents: Combining', contents.length, 'contents');
  
  if (!contents || contents.length === 0) {
    console.log('🔶 combineDeltaContents: No contents to combine');
    return createEmptyDelta();
  }
  
  try {
    // Parse all contents to ensure they're valid Deltas
    const parsedDeltas: DeltaOp[][] = [];
    
    for (const content of contents) {
      const result = validateDelta(content);
      
      if (result.valid && result.parsed) {
        // Get the ops from the parsed Delta
        parsedDeltas.push([...result.parsed.ops]);
        console.log('🔶 combineDeltaContents: Added', result.parsed.ops.length, 'ops from valid Delta');
      } else {
        // If any content is invalid, log and continue with empty Delta for that item
        console.log('🔶 combineDeltaContents: Invalid Delta, using empty for item:', result.reason);
        parsedDeltas.push([{ insert: '' }]);
      }
    }
    
    // Combine all ops into a single Delta
    const combinedOps = parsedDeltas.flat();
    
    // Ensure the last op ends with a newline
    if (combinedOps.length > 0) {
      const lastOp = combinedOps[combinedOps.length - 1];
      if (typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')) {
        combinedOps.push({ insert: '\n' });
      }
    } else {
      // If no valid ops, return an empty Delta
      combinedOps.push({ insert: '\n' });
    }
    
    console.log('🔶 combineDeltaContents: Successfully combined into Delta with', combinedOps.length, 'ops');
    return { ops: combinedOps };
  } catch (e) {
    console.error('🔶 combineDeltaContents: Error combining Deltas:', e);
    return null;
  }
};
