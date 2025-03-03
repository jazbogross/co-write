
/**
 * Utilities for working with Delta objects (Quill's content format)
 */
import { DeltaContent, DeltaOp, DeltaValidationResult } from './types';

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

/**
 * Logs the structure of a Delta object for debugging
 */
export const logDeltaStructure = (content: any | null): void => {
  if (!content) {
    console.log("🔶 logDeltaStructure: Delta content is null or empty");
    return;
  }
  
  try {
    const result = validateDelta(content);
    
    if (result.valid && result.parsed) {
      console.log("🔶 Delta structure:", {
        valid: true,
        opsCount: result.parsed.ops.length,
        firstOp: result.parsed.ops[0] || null,
        firstFewOps: result.parsed.ops.slice(0, 3).map(op => 
          typeof op.insert === 'string' 
            ? { insert: op.insert.substring(0, 20) + (op.insert.length > 20 ? '...' : ''), attributes: op.attributes }
            : op
        )
      });
    } else {
      console.log("🔶 Not a valid delta object:", {
        originalType: result.originalType,
        reason: result.reason,
        preview: typeof content === 'string' 
          ? content.substring(0, 40) + (content.length > 40 ? '...' : '')
          : content
      });
    }
  } catch (e) {
    console.error("🔶 Error parsing delta structure:", e);
  }
};

// Import from another file to avoid circular dependencies
import { extractPlainTextFromDelta } from './contentUtils';
