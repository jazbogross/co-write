
/**
 * Delta debugging utilities
 */
import { DeltaContent } from '../types';

/**
 * Logs a Delta object for debugging
 */
export const logDelta = (delta: any, label: string = 'Delta Debug'): void => {
  if (!delta) {
    console.log(`${label}: NULL or undefined Delta`);
    return;
  }
  
  try {
    if (typeof delta === 'object' && 'ops' in delta && Array.isArray(delta.ops)) {
      console.log(`${label}: Valid Delta with ${delta.ops.length} ops`);
      
      // Log the first few ops for debugging
      delta.ops.slice(0, 3).forEach((op: any, i: number) => {
        const insertType = typeof op.insert;
        const insertPreview = 
          insertType === 'string' 
            ? op.insert.substring(0, 30) + (op.insert.length > 30 ? '...' : '') 
            : `[${insertType} value]`;
            
        console.log(`${label} Op ${i + 1}: ${insertPreview} (attributes: ${JSON.stringify(op.attributes) || 'none'})`);
      });
      
      if (delta.ops.length > 3) {
        console.log(`${label}: ... and ${delta.ops.length - 3} more ops`);
      }
    } else if (typeof delta === 'string') {
      console.log(`${label}: String value (${delta.length} chars): ${delta.substring(0, 30)}...`);
    } else {
      console.log(`${label}: Invalid Delta format:`, delta);
    }
  } catch (e) {
    console.error(`${label}: Error logging Delta:`, e);
  }
};

/**
 * Logs the structure of a Delta object (ops, attributes, etc.)
 * Useful for debugging Delta objects
 */
export const logDeltaStructure = (delta: any, label: string = 'Delta Structure'): void => {
  if (!delta) {
    console.log(`${label}: NULL or undefined`);
    return;
  }
  
  try {
    if (typeof delta === 'object' && 'ops' in delta && Array.isArray(delta.ops)) {
      console.log(`${label}: Delta with ${delta.ops.length} ops`);
      
      // Log structure info for each op
      delta.ops.slice(0, 3).forEach((op: any, i: number) => {
        const hasInsert = 'insert' in op;
        const insertType = hasInsert ? typeof op.insert : 'missing';
        const hasAttributes = 'attributes' in op && op.attributes;
        
        console.log(`${label} Op ${i + 1}: insert (${insertType}), attributes: ${hasAttributes ? 'yes' : 'no'}`);
        
        if (hasAttributes) {
          const attrNames = Object.keys(op.attributes);
          console.log(`${label} Op ${i + 1} attributes: ${attrNames.join(', ')}`);
        }
      });
    } else {
      console.log(`${label}: Not a valid Delta:`, delta);
    }
  } catch (e) {
    console.error(`${label}: Error logging Delta structure:`, e);
  }
};

/**
 * Compares two Delta objects and logs the differences
 */
export const compareDelta = (delta1: any, delta2: any, label: string = 'Delta Comparison'): void => {
  if (!delta1 || !delta2) {
    console.log(`${label}: Cannot compare - one or both Deltas are null`);
    return;
  }
  
  try {
    const ops1Count = delta1.ops?.length || 0;
    const ops2Count = delta2.ops?.length || 0;
    
    console.log(`${label}: Delta 1 has ${ops1Count} ops, Delta 2 has ${ops2Count} ops`);
    
    if (ops1Count !== ops2Count) {
      console.log(`${label}: Different number of operations`);
    }
    
    // Compare the first few ops
    const opsToCompare = Math.min(ops1Count, ops2Count, 3);
    for (let i = 0; i < opsToCompare; i++) {
      const op1 = delta1.ops[i];
      const op2 = delta2.ops[i];
      
      if (op1.insert !== op2.insert) {
        console.log(`${label} Difference in op ${i + 1} insert: "${op1.insert}" vs "${op2.insert}"`);
      }
      
      if (JSON.stringify(op1.attributes) !== JSON.stringify(op2.attributes)) {
        console.log(`${label} Difference in op ${i + 1} attributes:`, op1.attributes, 'vs', op2.attributes);
      }
    }
  } catch (e) {
    console.error(`${label}: Error comparing Deltas:`, e);
  }
};
