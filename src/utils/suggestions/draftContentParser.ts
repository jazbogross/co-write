
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

/**
 * Parse draft content from various formats
 */
export const parseDraftContent = (content: any): DeltaContent => {
  // Already a Delta object
  if (isDeltaObject(content)) {
    return content;
  }
  
  // Try to parse as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (isDeltaObject(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Not valid JSON, treat as plain text
    }
    
    // Plain text - convert to Delta
    return {
      ops: [{ insert: content }]
    };
  }
  
  // Fallback to empty Delta
  return {
    ops: [{ insert: '\n' }]
  };
};
