
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

/**
 * Normalizes content to its appropriate format for storage
 * Handles both string and Delta object formats
 */
export const normalizeContentForStorage = (content: any): string => {
  if (isDeltaObject(content)) {
    // If it's already a Delta object, stringify it ONCE
    return JSON.stringify(content);
  } else if (typeof content === 'string') {
    // If the content is already a string, check if it's a stringified Delta
    try {
      const parsed = JSON.parse(content);
      // If it parsed successfully and looks like a Delta, return the string as is
      if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
        return content;
      }
    } catch (e) {
      // Not a JSON string, so it's just plain text - return as is
    }
    return content;
  }
  
  // Fallback to empty string for null or undefined
  return '';
};

/**
 * Creates a content map from existing script content
 * Maps trimmed content to its UUID and line number
 */
export const createContentMap = (existingContent: any[]): Map<string, { uuid: string, lineNumber: number }> => {
  const contentMap = new Map();
  
  if (existingContent) {
    existingContent.forEach(line => {
      contentMap.set(line.content.trim(), {
        uuid: line.id,
        lineNumber: line.line_number
      });
    });
  }
  
  return contentMap;
};
