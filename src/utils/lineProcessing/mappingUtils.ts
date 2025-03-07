
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

/**
 * Helper function to get plain text for mapping purposes
 */
export function getPlainTextForMapping(content: any): string {
  if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content);
  } else if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
    try {
      const parsedContent = JSON.parse(content);
      if (parsedContent && Array.isArray(parsedContent.ops)) {
        return extractPlainTextFromDelta(parsedContent);
      }
    } catch (e) {
      // If parsing fails, fall back to treating as string
      console.error('Error parsing potential Delta string in getPlainTextForMapping:', e);
    }
  }
  return typeof content === 'string' ? content : String(content);
}

/**
 * Determine if content is a stringified Delta object
 */
export function isStringifiedDelta(content: any): boolean {
  if (typeof content !== 'string') return false;
  
  try {
    if (content.startsWith('{') && content.includes('"ops"')) {
      const parsed = JSON.parse(content);
      return parsed && Array.isArray(parsed.ops);
    }
  } catch (e) {
    // Not a valid JSON
  }
  
  return false;
}

/**
 * Parse a stringified Delta if possible, otherwise return the original content
 */
export function parseStringifiedDeltaIfPossible(content: any): any {
  if (!isStringifiedDelta(content)) return content;
  
  try {
    return JSON.parse(content);
  } catch (e) {
    return content;
  }
}
