
/**
 * Basic operations for working with Delta objects
 */
import { DeltaContent, DeltaOp } from '../types';
import { validateDelta } from '../validation/deltaValidation';

/**
 * Checks if content is a valid Delta object
 */
export const isDeltaObject = (content: any | null): boolean => {
  console.log('🔶 isDeltaObject: Checking content of type', typeof content);
  return validateDelta(content).valid;
};

/**
 * Safely parses a Delta from string or returns the Delta object directly
 * Returns null if the content is not a valid Delta
 */
export const safelyParseDelta = (content: any | null): DeltaContent | null => {
  console.log('🔶 safelyParseDelta: Parsing content of type', typeof content);
  const result = validateDelta(content);
  
  if (result.valid && result.parsed) {
    console.log('🔶 safelyParseDelta: Successfully parsed Delta');
    return result.parsed;
  }
  
  console.log('🔶 safelyParseDelta: Failed to parse Delta:', result.reason);
  return null;
};

/**
 * Creates an empty Delta content object
 */
export const createEmptyDelta = (): DeltaContent => {
  console.log('🔶 createEmptyDelta: Creating empty Delta');
  return { ops: [{ insert: '\n' }] };
};

/**
 * Ensures delta operations have valid structure
 */
export const sanitizeDeltaOps = (ops: any[]): DeltaOp[] => {
  if (!Array.isArray(ops)) {
    console.log('🔶 sanitizeDeltaOps: ops is not an array, returning empty ops array');
    return [{ insert: '\n' }];
  }
  
  return ops.map(op => {
    // Ensure insert property exists
    if (!op.insert) {
      return { insert: '' };
    }
    
    // Ensure insert is string or object
    if (typeof op.insert !== 'string' && typeof op.insert !== 'object') {
      return { ...op, insert: String(op.insert) };
    }
    
    return op;
  });
};

/**
 * Compares two Delta objects for equality
 */
export const areDeltasEqual = (delta1: DeltaContent | null, delta2: DeltaContent | null): boolean => {
  if (!delta1 && !delta2) return true;
  if (!delta1 || !delta2) return false;
  
  if (!delta1.ops || !delta2.ops) return false;
  if (delta1.ops.length !== delta2.ops.length) return false;
  
  for (let i = 0; i < delta1.ops.length; i++) {
    const op1 = delta1.ops[i];
    const op2 = delta2.ops[i];
    
    if (typeof op1.insert !== typeof op2.insert) return false;
    
    if (typeof op1.insert === 'string' && op1.insert !== op2.insert) return false;
    
    if (typeof op1.insert === 'object' && JSON.stringify(op1.insert) !== JSON.stringify(op2.insert)) {
      return false;
    }
    
    // Compare attributes
    if (JSON.stringify(op1.attributes) !== JSON.stringify(op2.attributes)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Normalizes a Delta object to ensure it has valid structure
 */
export const normalizeDelta = (content: any): DeltaContent => {
  // If already a valid Delta, return it
  const validationResult = validateDelta(content);
  if (validationResult.valid && validationResult.parsed) {
    return validationResult.parsed;
  }
  
  // Create a valid Delta
  if (typeof content === 'string') {
    return { ops: [{ insert: content + (content.endsWith('\n') ? '' : '\n') }] };
  }
  
  return createEmptyDelta();
};
