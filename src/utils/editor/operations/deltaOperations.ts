
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
