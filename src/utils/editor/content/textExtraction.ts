
/**
 * Utilities for extracting text content from various formats
 */
import { DeltaContent, DeltaOp } from '../types';
import { validateDelta } from '../validation/deltaValidation';

/**
 * Extracts plain text from a Delta object or returns the string directly
 */
export const extractPlainTextFromDelta = (content: any | null): string => {
  console.log('🔷 extractPlainTextFromDelta: Processing content of type', typeof content);
  
  if (!content) {
    console.log('🔷 extractPlainTextFromDelta: Content is null or undefined, returning empty string');
    return '';
  }
  
  try {
    // For plain strings that don't look like Delta JSON, return directly
    if (typeof content === 'string' && 
        (!content.startsWith('{') || !content.includes('ops'))) {
      console.log('🔷 extractPlainTextFromDelta: Content is plain text, returning directly');
      return content;
    }
    
    // Try to parse as Delta
    const result = validateDelta(content);
    
    if (result.valid && result.parsed) {
      console.log('🔷 extractPlainTextFromDelta: Content is valid Delta, extracting text');
      return extractTextFromDeltaOps(result.parsed.ops);
    }
    
    // Fallback: If not Delta, return as string
    console.log('🔷 extractPlainTextFromDelta: Not a valid Delta, returning as string');
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (e) {
    console.error('🔷 extractPlainTextFromDelta: Error extracting text:', e);
    return typeof content === 'string' ? content : String(content);
  }
};

/**
 * Extracts text content from Delta operations
 */
export function extractTextFromDeltaOps(ops: DeltaOp[]): string {
  if (!Array.isArray(ops)) {
    console.log('🔷 extractTextFromDeltaOps: Ops is not an array, returning empty string');
    return '';
  }
  
  console.log('🔷 extractTextFromDeltaOps: Processing', ops.length, 'ops');
  
  let result = '';
  ops.forEach((op: DeltaOp) => {
    if (typeof op.insert === 'string') {
      result += op.insert;
    } else if (op.insert && typeof op.insert === 'object') {
      // Handle embeds or other non-string inserts
      result += ' ';
    }
  });
  
  // Ensure the result has a proper newline if needed
  if (result.length > 0 && !result.endsWith('\n')) {
    result += '\n';
  }
  
  console.log('🔷 extractTextFromDeltaOps: Extracted', result.length, 'characters');
  return result;
}
