
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

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
 * Extract plain text content for safe comparison
 */
export const getPlainTextContent = (content: any): string => {
  if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content);
  }
  return typeof content === 'string' ? content : '';
};

/**
 * Split content into lines, preserving line breaks
 */
export const splitContentIntoLines = (content: string): string[] => {
  if (!content) return [];
  return content.split('\n');
};

/**
 * Join lines with proper line breaks
 */
export const joinLinesWithBreaks = (lines: string[]): string => {
  return lines.join('\n');
};
