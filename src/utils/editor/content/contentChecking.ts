
/**
 * Utilities for checking Delta content validity and characteristics
 */
import { DeltaContent } from '../types';
import { isDeltaObject } from '../validation/deltaValidation';
import { extractPlainTextFromDelta } from './textExtraction';

/**
 * Checks if Delta content is empty
 */
export const isDeltaEmpty = (content: DeltaContent | string | null): boolean => {
  if (!content) return true;
  
  if (isDeltaObject(content)) {
    // Check if Delta has no ops or only contains empty inserts/newlines
    if (!content.ops || content.ops.length === 0) {
      return true;
    }
    
    // Extract text and check if it's only whitespace
    const text = extractPlainTextFromDelta(content);
    return !text || text.trim() === '';
  }
  
  if (typeof content === 'string') {
    return content.trim() === '';
  }
  
  return true;
};

/**
 * Checks if Delta contains only a single empty line
 */
export const isEmptySingleLine = (content: DeltaContent | string | null): boolean => {
  if (!content) return true;
  
  if (isDeltaObject(content)) {
    if (!content.ops || content.ops.length === 0) {
      return true;
    }
    
    // Check if it contains only a newline or empty string
    if (content.ops.length === 1) {
      const op = content.ops[0];
      return !op.insert || op.insert === '' || op.insert === '\n';
    }
    
    if (content.ops.length === 2) {
      const firstOp = content.ops[0];
      const secondOp = content.ops[1];
      // Check if it's an empty string followed by a newline
      return (!firstOp.insert || firstOp.insert === '') && 
             (secondOp.insert === '\n');
    }
  }
  
  if (typeof content === 'string') {
    return content === '' || content === '\n';
  }
  
  return false;
};

/**
 * Estimates the number of lines in Delta content
 */
export const estimateLineCount = (content: DeltaContent | string | null): number => {
  if (!content) return 0;
  
  if (isDeltaObject(content)) {
    const text = extractPlainTextFromDelta(content);
    return text.split('\n').length;
  }
  
  if (typeof content === 'string') {
    return content.split('\n').length;
  }
  
  return 0;
};
