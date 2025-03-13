
import { DeltaContent } from './types';

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

// Re-export the types
export * from './types';
