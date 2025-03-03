
/**
 * Utilities for working with content extraction and transformation
 */
import { isDeltaObject } from './deltaUtils';

/**
 * Extracts plain text from a Delta object or returns the string directly
 */
export const extractPlainTextFromDelta = (content: string | any | null): string => {
  if (!content) return '';
  
  try {
    // If the content is already plain text (not a Delta), return it directly
    if (typeof content === 'string' && 
        (!content.startsWith('{') || !content.includes('ops'))) {
      return content;
    }
    
    // Handle Delta objects directly
    if (typeof content === 'object' && content.ops) {
      return extractTextFromDeltaOps(content.ops);
    }
    
    // Parse if it's a JSON string
    if (typeof content === 'string') {
      try {
        const delta = JSON.parse(content);
        if (delta && delta.ops) {
          return extractTextFromDeltaOps(delta.ops);
        }
      } catch (e) {
        // If it can't be parsed as JSON, it's likely already plain text
        return content;
      }
    }
    
    // Fallback: Return as string
    return typeof content === 'string' ? content : JSON.stringify(content);
  } catch (e) {
    console.error('Error extracting plain text from delta:', e);
    return typeof content === 'string' ? content : JSON.stringify(content);
  }
};

/**
 * Extracts text content from Delta operations
 */
export function extractTextFromDeltaOps(ops: any[]): string {
  if (!Array.isArray(ops)) return '';
  
  let result = '';
  ops.forEach((op: any) => {
    if (typeof op.insert === 'string') {
      result += op.insert;
    } else if (op.insert && typeof op.insert === 'object') {
      // Handle embeds or other non-string inserts
      result += ' ';
    }
  });
  
  // Ensure the result has a proper newline if needed
  if (!result.endsWith('\n')) {
    result += '\n';
  }
  return result;
}

/**
 * Safely check if content is empty (handles both strings and Delta objects)
 */
export const isContentEmpty = (content: any): boolean => {
  // Handle Delta objects
  if (isDeltaObject(content)) {
    const plainText = extractPlainTextFromDelta(content);
    return !plainText || !plainText.trim();
  }
  
  // Handle strings
  if (typeof content === 'string') {
    return !content || !content.trim();
  }
  
  // For other types (undefined, null, etc.)
  return true;
};

/**
 * Get trimmed content regardless of content type (string or Delta)
 */
export const getTrimmedContent = (content: any): string => {
  if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content).trim();
  }
  
  return typeof content === 'string' ? content.trim() : '';
};
