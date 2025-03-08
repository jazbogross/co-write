
/**
 * Utilities for extracting text content from Delta objects
 */
import { DeltaContent } from '../types';
import { isDeltaObject } from '../validation/deltaValidation';

/**
 * Extracts plain text from a Delta object
 */
export const extractPlainTextFromDelta = (delta: DeltaContent | string | null | undefined): string => {
  if (!delta) return '';
  
  // Return string content directly
  if (typeof delta === 'string') {
    return delta;
  }
  
  // Ensure we have a valid Delta object
  if (!isDeltaObject(delta)) {
    return '';
  }
  
  try {
    // Extract text from each operation
    let text = '';
    
    if (delta.ops) {
      delta.ops.forEach(op => {
        if (op.insert) {
          text += typeof op.insert === 'string' ? op.insert : '';
        }
      });
    }
    
    return text;
  } catch (e) {
    console.error('Error extracting text from Delta:', e);
    return '';
  }
};

/**
 * Gets text from Delta with preserved newlines
 */
export const getTextWithNewlines = (delta: DeltaContent | string | null | undefined): string => {
  const text = extractPlainTextFromDelta(delta);
  // Ensure we don't lose trailing newlines by processing them properly
  return text;
};

/**
 * Gets a short preview of Delta content
 */
export const getContentPreview = (delta: DeltaContent | string | null | undefined, maxLength: number = 30): string => {
  const text = extractPlainTextFromDelta(delta);
  
  if (!text) {
    return '';
  }
  
  // Replace newlines with spaces for preview and truncate
  const preview = text.replace(/\n/g, ' ');
  if (preview.length <= maxLength) {
    return preview;
  }
  
  return preview.substring(0, maxLength) + '...';
};
