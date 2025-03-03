
/**
 * Utilities for checking content states and properties
 */
import { isDeltaObject } from '../operations/deltaOperations';
import { extractPlainTextFromDelta } from './textExtraction';

/**
 * Safely check if content is empty (handles both strings and Delta objects)
 */
export const isContentEmpty = (content: any): boolean => {
  console.log('🔷 isContentEmpty: Checking content of type', typeof content);
  
  if (isDeltaObject(content)) {
    const plainText = extractPlainTextFromDelta(content);
    const isEmpty = !plainText || !plainText.trim();
    console.log('🔷 isContentEmpty: Valid Delta, is empty:', isEmpty);
    return isEmpty;
  }
  
  // Handle strings
  if (typeof content === 'string') {
    const isEmpty = !content || !content.trim();
    console.log('🔷 isContentEmpty: String content, is empty:', isEmpty);
    return isEmpty;
  }
  
  // For other types (undefined, null, etc.)
  console.log('🔷 isContentEmpty: Other content type, treating as empty');
  return true;
};

/**
 * Get trimmed content regardless of content type (string or Delta)
 */
export const getTrimmedContent = (content: any): string => {
  console.log('🔷 getTrimmedContent: Processing content of type', typeof content);
  
  if (isDeltaObject(content)) {
    const text = extractPlainTextFromDelta(content).trim();
    console.log('🔷 getTrimmedContent: Valid Delta, trimmed text length:', text.length);
    return text;
  }
  
  const trimmed = typeof content === 'string' ? content.trim() : '';
  console.log('🔷 getTrimmedContent: String content, trimmed length:', trimmed.length);
  return trimmed;
};
