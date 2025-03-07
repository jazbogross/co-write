
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

/**
 * Normalizes content to its appropriate string format for storage
 * Handles both string and Delta object formats
 */
export const normalizeContentForStorage = (content: any): string => {
  if (isDeltaObject(content)) {
    return JSON.stringify(content);
  }
  
  return typeof content === 'string' ? content : '';
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
