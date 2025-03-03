
/**
 * Utilities for working with Delta objects (Quill's content format)
 */

/**
 * Checks if content is a valid Delta object
 */
export const isDeltaObject = (content: string | any | null): boolean => {
  if (!content) return false;
  
  try {
    // If it's already an object with ops property
    if (typeof content === 'object' && content.ops && Array.isArray(content.ops)) {
      return true;
    }
    
    // If it's a string, try parsing it
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      return !!delta && !!delta.ops && Array.isArray(delta.ops);
    }
  } catch (e) {
    // Not a valid JSON or Delta
  }
  
  return false;
};

/**
 * Safely parses a Delta from string or returns the Delta object directly
 */
export const safelyParseDelta = (content: string | any | null): any => {
  if (!content) return null;
  
  try {
    // If content is already a Delta object, return it directly
    if (typeof content === 'object' && content.ops && Array.isArray(content.ops)) {
      return content;
    }
    
    // If it's a string, try parsing it
    if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      const delta = JSON.parse(content);
      
      // Check if this is a valid Delta object
      if (delta && delta.ops && Array.isArray(delta.ops)) {
        // Check for double-wrapped Deltas (Delta objects in insert properties)
        let hasNestedDeltas = false;
        const normalizedOps = delta.ops.map((op: any) => {
          if (typeof op.insert === 'string' && op.insert.startsWith('{') && op.insert.includes('ops')) {
            hasNestedDeltas = true;
            try {
              // Try to extract the actual content from the nested Delta
              const nestedContent = extractPlainTextFromDelta(op.insert);
              return { ...op, insert: nestedContent };
            } catch (e) {
              return op; // Keep original if extraction fails
            }
          }
          return op;
        });
        
        if (hasNestedDeltas) {
          console.log('Normalized nested Deltas in content');
          return { ops: normalizedOps };
        }
        
        return delta;
      }
    }
  } catch (e) {
    console.error('Error parsing Delta:', e);
  }
  
  // Not a Delta or parsing failed
  return null;
};

/**
 * Logs the structure of a Delta object for debugging
 */
export const logDeltaStructure = (content: string | any | null): void => {
  if (!content) {
    console.log("Delta content is null or empty");
    return;
  }
  
  try {
    let delta = null;
    
    // Handle different input types
    if (typeof content === 'object' && content?.ops) {
      delta = content;
    } else if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
      delta = JSON.parse(content);
    }
    
    if (delta) {
      console.log("Delta structure:", {
        hasOps: !!(delta && delta.ops),
        opsCount: delta?.ops?.length ?? 0,
        firstOp: delta?.ops?.[0] ?? null,
        plainText: delta ? extractPlainTextFromDelta(content) : ''
      });
    } else {
      console.log("Not a delta object:", content);
    }
  } catch (e) {
    console.error("Error parsing delta structure:", e);
  }
};

// Import from another file to avoid circular dependencies
import { extractPlainTextFromDelta } from './contentUtils';
