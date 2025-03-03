
import { isDeltaObject, extractPlainTextFromDelta as extractPlainText } from '../editor';

/**
 * Re-export the isContentEmpty function from editor utils
 */
export const isContentEmpty = (content: any): boolean => {
  // Handle Delta objects
  if (isDeltaObject(content)) {
    const plainText = extractPlainText(content);
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
 * Safely extracts plain text content for comparison
 */
export const extractPlainTextForComparison = (content: any): string => {
  if (isDeltaObject(content)) {
    return extractPlainText(content);
  } else if (typeof content !== 'string') {
    return String(content || '');
  }
  return content;
};

/**
 * Safely checks if two content items are equivalent
 */
export const contentMatches = (content1: any, content2: any): boolean => {
  const text1 = extractPlainTextForComparison(content1);
  const text2 = extractPlainTextForComparison(content2);
  
  return text1 === text2;
};

/**
 * Check if one content contains another
 */
export const contentContains = (container: any, contained: any): boolean => {
  const containerText = extractPlainTextForComparison(container);
  const containedText = extractPlainTextForComparison(contained);
  
  if (!containerText || !containedText) return false;
  
  return containerText.includes(containedText);
};
