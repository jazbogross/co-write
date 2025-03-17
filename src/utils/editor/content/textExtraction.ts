
/**
 * Utilities for extracting text content from Delta objects
 */
import { DeltaContent } from '../types';

/**
 * Extract plain text from a Delta object
 */
export const extractPlainTextFromDelta = (content: any): string => {
  // For null/undefined content
  if (!content) return '';
  
  // If it's a string, return it directly
  if (typeof content === 'string') return content;
  
  // Check if it has ops array (Delta object)
  if (content && Array.isArray(content.ops)) {
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
 * Extracts lines from Delta content
 */
export const extractLinesFromDelta = (delta: DeltaContent): string[] => {
  const text = extractPlainTextFromDelta(delta);
  return text.split('\n');
};

/**
 * Counts the number of lines in Delta content
 */
export const countLinesInDelta = (delta: DeltaContent): number => {
  // Count newlines in the Delta
  let lineCount = 0;
  
  if (delta && Array.isArray(delta.ops)) {
    delta.ops.forEach(op => {
      if (op.insert && typeof op.insert === 'string') {
        // Count newlines in the insert string
        const matches = op.insert.match(/\n/g);
        if (matches) {
          lineCount += matches.length;
        }
      }
    });
  }
  
  // Ensure at least one line
  return Math.max(1, lineCount);
};
