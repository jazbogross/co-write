
import { ContentType, Delta } from '@/types/editor';
import { extractPlainTextFromDelta, isDeltaObject } from './editor';

/**
 * Returns the plain text content from either a string or Delta object
 */
export const getPlainTextContent = (content: ContentType): string => {
  if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content);
  }
  return typeof content === 'string' ? content : '';
};

/**
 * Safely checks if content is empty (handles both strings and Delta objects)
 */
export const isContentEmpty = (content: ContentType): boolean => {
  const plainText = getPlainTextContent(content);
  return !plainText || !plainText.trim();
};

/**
 * Safely trims content (handles both strings and Delta objects)
 */
export const trimContent = (content: ContentType): string => {
  const plainText = getPlainTextContent(content);
  return plainText.trim();
};

/**
 * Converts any content to string for database storage
 */
export const stringifyContent = (content: ContentType): string => {
  if (typeof content === 'string') {
    return content;
  }
  return JSON.stringify(content);
};
