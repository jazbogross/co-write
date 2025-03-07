
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
    }
  }
  return typeof content === 'string' ? content : String(content);
}
