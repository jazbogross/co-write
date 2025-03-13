
import { DeltaContent, DeltaOp } from './types';

/**
 * Check if a value is a Delta object
 */
export const isDeltaObject = (content: any): boolean => {
  if (!content) return false;
  
  // Must be an object with an ops array
  return typeof content === 'object' && 
         content !== null && 
         'ops' in content && 
         Array.isArray(content.ops);
};

/**
 * Extract plain text from a Delta object
 */
export const extractPlainTextFromDelta = (content: any): string => {
  // For null/undefined content
  if (!content) return '';
  
  // If it's a string, return it directly
  if (typeof content === 'string') return content;
  
  // Check if it's a Delta object
  if (isDeltaObject(content)) {
    let text = '';
    
    // Process each op to extract text
    content.ops.forEach((op: any) => {
      if (op.insert) {
        if (typeof op.insert === 'string') {
          text += op.insert;
        } else if (typeof op.insert === 'object') {
          // Handle embeds like images
          text += ' ';
        }
      }
    });
    
    return text;
  }
  
  // Fallback: stringify the object
  try {
    return JSON.stringify(content);
  } catch (e) {
    return String(content);
  }
};

/**
 * Combine multiple Delta contents into a single Delta
 */
export const combineDeltaContents = (deltaContents: any[]): DeltaContent | null => {
  if (!deltaContents || deltaContents.length === 0) return null;
  
  // Initialize with empty Delta
  const combinedDelta: DeltaContent = { ops: [] };
  
  // Combine all valid Delta contents
  deltaContents.forEach(content => {
    if (isDeltaObject(content)) {
      // Add ops from this Delta
      combinedDelta.ops = [...combinedDelta.ops, ...content.ops];
    } else if (typeof content === 'string') {
      // Convert string to Delta op
      combinedDelta.ops.push({ insert: content });
    }
  });
  
  // Ensure we have at least a newline
  if (combinedDelta.ops.length === 0) {
    combinedDelta.ops.push({ insert: '\n' });
  }
  
  return combinedDelta;
};

/**
 * Log Delta structure for debugging
 */
export const logDeltaStructure = (delta: any, label = 'Delta'): void => {
  console.log(`---- ${label} Structure ----`);
  if (!delta) {
    console.log('Null or undefined delta');
    return;
  }
  
  console.log(`Type: ${typeof delta}`);
  if (isDeltaObject(delta)) {
    console.log(`Ops count: ${delta.ops.length}`);
    console.log('First 3 ops:', delta.ops.slice(0, 3));
  } else {
    console.log('Not a valid Delta object');
    console.log('Value:', delta);
  }
};

/**
 * Safely parse a Delta from string or object
 */
export const safelyParseDelta = (content: any): DeltaContent | null => {
  // Already a Delta object
  if (isDeltaObject(content)) {
    return content;
  }
  
  // Try to parse string as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (isDeltaObject(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Not parseable as JSON
    }
  }
  
  return null;
};

/**
 * Reconstruct content from line data (for backward compatibility)
 */
export const reconstructContent = (lineData: any[]): DeltaContent => {
  // For empty line data, return empty Delta
  if (!lineData || lineData.length === 0) {
    return { ops: [{ insert: '\n' }] };
  }
  
  // Initialize with first line's content
  let result: DeltaContent = { ops: [] };
  
  // Process each line
  lineData.forEach(line => {
    if (isDeltaObject(line.content)) {
      // Add ops from this line's Delta
      result.ops = [...result.ops, ...line.content.ops];
    } else if (typeof line.content === 'string') {
      // Convert string to Delta op
      result.ops.push({ insert: line.content + '\n' });
    }
  });
  
  // Ensure we have at least a newline
  if (result.ops.length === 0) {
    result.ops.push({ insert: '\n' });
  }
  
  return result;
};

// Re-export the types
export * from './types';
