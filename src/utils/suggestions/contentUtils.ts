
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';
import { DeltaStatic } from 'quill';

/**
 * Normalizes content to its appropriate format for storage
 * Handles both string and Delta object formats
 */
export const normalizeContentForStorage = (content: any): any => {
  if (!content) {
    return { ops: [{ insert: '\n' }] };
  }
  
  // Handle HTML strings - convert to plain text
  if (typeof content === 'string' && content.includes('<')) {
    console.warn('HTML detected in Delta string - converting to plain text');
    return { 
      ops: [{ 
        insert: content.replace(/<[^>]*>/g, '') + 
        (content.endsWith('\n') ? '' : '\n') 
      }] 
    };
  }
  
  // If it's a Delta object with ops property
  if (content.ops) {
    // Convert to plain object for JSON storage
    return JSON.parse(JSON.stringify(content));
  }
  
  // If it's a string, try to parse it as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
        return parsed;
      }
      // Not a Delta JSON, convert to basic Delta
      return { ops: [{ insert: content + (content.endsWith('\n') ? '' : '\n') }] };
    } catch (e) {
      // Not JSON, convert to basic Delta
      return { ops: [{ insert: content + (content.endsWith('\n') ? '' : '\n') }] };
    }
  }
  
  // Handle unknown content
  return { ops: [{ insert: String(content || '') + '\n' }] };
};

/**
 * Creates a content map from existing script content
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

/**
 * Ensures a Delta object has a proper structure
 */
export const ensureDeltaStructure = (content: any): DeltaContent => {
  // If it's already a proper Delta object
  if (content && typeof content === 'object' && 'ops' in content) {
    return content as DeltaContent;
  }
  
  // Handle string content
  if (typeof content === 'string') {
    try {
      // Try to parse as JSON Delta
      const parsed = JSON.parse(content);
      if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
        return parsed as DeltaContent;
      }
    } catch (e) {
      // Not valid JSON, convert to basic Delta
    }
    
    return { ops: [{ insert: content + (content.endsWith('\n') ? '' : '\n') }] };
  }
  
  // Default empty Delta
  return { ops: [{ insert: '\n' }] };
};
