
/**
 * Utilities for extracting plain text from Delta objects
 */
import { DeltaContent, DeltaOp } from '../types';
import { validateDelta } from '../validation/deltaValidation';

/**
 * Extracts plain text content from a Delta object
 */
export const extractPlainTextFromDelta = (content: any): string => {
  console.log('🔷 extractPlainTextFromDelta: Processing content of type', typeof content);
  
  // Handle null/undefined content
  if (content == null) {
    console.log('🔷 extractPlainTextFromDelta: Content is null or undefined');
    return '';
  }
  
  // If it's already a string, just return it
  if (typeof content === 'string') {
    console.log('🔷 extractPlainTextFromDelta: Content is already a string');
    return content;
  }
  
  try {
    // Validate if content is a Delta
    const result = validateDelta(content);
    
    if (result.valid && result.parsed) {
      console.log('🔷 extractPlainTextFromDelta: Content is valid Delta, extracting text');
      const text = extractTextFromDeltaOps(result.parsed.ops);
      return text;
    }
    
    // If it's an object but not a valid Delta, try to stringify it
    if (typeof content === 'object') {
      console.log('🔷 extractPlainTextFromDelta: Content is an object but not a valid Delta');
      try {
        return JSON.stringify(content);
      } catch (error) {
        console.error('🔷 extractPlainTextFromDelta: Error stringifying content:', error);
        return String(content);
      }
    }
    
    // Fallback - convert to string
    return String(content);
  } catch (error) {
    console.error('🔷 extractPlainTextFromDelta: Error processing content:', error);
    return String(content);
  }
};

/**
 * Extracts text from Delta ops array
 */
export const extractTextFromDeltaOps = (ops: DeltaOp[]): string => {
  console.log('🔷 extractTextFromDeltaOps: Processing', ops?.length, 'ops');
  
  if (!ops || !Array.isArray(ops)) {
    console.log('🔷 extractTextFromDeltaOps: No valid ops');
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
  
  console.log('🔷 extractTextFromDeltaOps: Extracted', text.length, 'characters');
  return text;
};
