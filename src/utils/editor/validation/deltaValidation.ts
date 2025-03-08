
/**
 * Delta validation utilities
 */
import { DeltaContent, DeltaOp, DeltaValidationResult } from '../types';

/**
 * Validates if content is a Delta object and returns diagnostic information
 */
export const validateDelta = (content: any): DeltaValidationResult => {
  console.log('🔶 validateDelta: Validating content of type', typeof content);
  
  const result: DeltaValidationResult = {
    valid: false,
    originalType: typeof content
  };
  
  // Handle null or undefined
  if (content == null) {
    console.log('🔶 validateDelta: Content is null or undefined');
    result.reason = 'Content is null or undefined';
    return result;
  }
  
  try {
    // Case 1: Already a valid Delta object
    if (typeof content === 'object' && content.ops && Array.isArray(content.ops)) {
      console.log('🔶 validateDelta: Content is already a Delta object with', content.ops.length, 'ops');
      
      // Check if ops are valid
      const allValid = content.ops.every((op: any) => 
        op && typeof op === 'object' && 'insert' in op && 
        (typeof op.insert === 'string' || typeof op.insert === 'object')
      );
      
      if (allValid) {
        result.valid = true;
        result.parsed = content as DeltaContent;
        return result;
      } else {
        console.log('🔶 validateDelta: Delta object has invalid ops structure');
        result.reason = 'Delta object has invalid ops structure';
        return result;
      }
    }
    
    // Case 2: JSON string that might be a Delta
    if (typeof content === 'string') {
      // Quick check before parsing
      if (!content.includes('ops') || !content.startsWith('{')) {
        console.log('🔶 validateDelta: String content does not match Delta pattern');
        result.reason = 'String content is not a Delta JSON';
        return result;
      }
      
      try {
        const parsed = JSON.parse(content);
        
        if (parsed && parsed.ops && Array.isArray(parsed.ops)) {
          console.log('🔶 validateDelta: Successfully parsed string to Delta with', parsed.ops.length, 'ops');
          
          // Check if ops are valid
          const allValid = parsed.ops.every((op: any) => 
            op && typeof op === 'object' && 'insert' in op &&
            (typeof op.insert === 'string' || typeof op.insert === 'object')
          );
          
          if (allValid) {
            result.valid = true;
            result.parsed = parsed as DeltaContent;
            return result;
          } else {
            console.log('🔶 validateDelta: Parsed Delta has invalid ops structure');
            result.reason = 'Parsed Delta has invalid ops structure';
            return result;
          }
        } else {
          console.log('🔶 validateDelta: Parsed object is not a valid Delta');
          result.reason = 'Parsed object is not a valid Delta';
          return result;
        }
      } catch (e) {
        console.log('🔶 validateDelta: Failed to parse string as JSON:', e);
        result.reason = 'Failed to parse string as JSON';
        return result;
      }
    }
    
    // Case 3: Not a Delta
    console.log('🔶 validateDelta: Content is not a Delta (type: ' + typeof content + ')');
    result.reason = `Content type ${typeof content} is not a valid Delta`;
    return result;
    
  } catch (e) {
    // Handle any unexpected errors
    console.error('🔶 validateDelta: Unexpected error during validation:', e);
    result.reason = `Validation error: ${e.message}`;
    return result;
  }
};
