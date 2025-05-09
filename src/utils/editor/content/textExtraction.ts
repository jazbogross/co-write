
/**
 * Utilities for extracting text from Delta objects
 */
import { DeltaContent, DeltaOp } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/deltaUtils';

/**
 * Extracts plain text content from a Delta object
 */
export const extractPlainTextFromDelta = (content: any): string => {
  // Handle null/undefined content
  if (content == null) {
    return '';
  }
  
  // If it's already a string, just return it
  if (typeof content === 'string') {
    return content;
  }
  
  try {
    // If it's an object with ops property that's an array
    if (isDeltaObject(content)) {
      return extractTextFromDeltaOps(content.ops);
    }
    
    // If it's an object but not a valid Delta, try to stringify it
    if (typeof content === 'object') {
      try {
        return JSON.stringify(content);
      } catch (error) {
        return String(content);
      }
    }
    
    // Fallback - convert to string
    return String(content);
  } catch (error) {
    console.error('Error processing content:', error);
    return String(content);
  }
};

/**
 * Extracts text from Delta ops array
 */
export const extractTextFromDeltaOps = (ops: DeltaOp[]): string => {
  if (!ops || !Array.isArray(ops)) {
    return '';
  }
  
  let text = '';
  
  for (const op of ops) {
    if (op.insert) {
      if (typeof op.insert === 'string') {
        text += op.insert;
      } else if (typeof op.insert === 'object') {
        // Handle embeds (images, videos, etc.)
        text += ' ';
      }
    }
  }
  
  return text;
};
