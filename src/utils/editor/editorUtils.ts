
/**
 * Utilities for working with Quill Editor
 */
import { isDeltaObject } from './deltaUtils';
import { extractPlainTextFromDelta } from './contentUtils';

/**
 * Extracts line contents from the editor
 */
export const extractLineContents = (lines: any[], quill: any): any[] => {
  return lines.map(line => {
    if (!line.domNode) return '';
    
    // Get the index range for this line
    const startIndex = quill.getIndex(line);
    const endIndex = line.next ? quill.getIndex(line.next) : quill.getLength();
    
    // Extract the content while preserving formatting
    const delta = quill.getContents(startIndex, endIndex - startIndex);
    
    // Return the delta object directly, not as a string
    return delta;
  });
};

/**
 * Preserves formatted content from the editor
 */
export const preserveFormattedContent = (content: string | any, quill: any): any => {
  if (!quill) return content;
  
  // If content is already a Delta object, return it directly
  if (typeof content === 'object' && content.ops) {
    console.log('Content is already a Delta object, not rewrapping');
    return content;
  }
  
  // If we already have a Quill editor with content, get its contents as Delta
  if (quill.getLength() > 1) { // > 1 because empty editor has length 1 (newline)
    return quill.getContents();
  }
  
  return content;
};

/**
 * Safely converts a string to Delta for storage if it's a stringified Delta
 */
export const safeDeltaFromString = (content: string | any): any => {
  if (isDeltaObject(content)) return content;
  
  if (typeof content === 'string' && content.startsWith('{') && content.includes('ops')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.ops)) {
        return parsed;
      }
    } catch (e) {
      console.error('Error parsing Delta from string:', e);
    }
  }
  
  // If not a valid Delta, return the original content
  return content;
};

/**
 * Gets the current content for a given line from the editor
 */
export const getLineContent = (line: any, quill: any): any => {
  if (!line || !quill) return '';
  
  const startIndex = quill.getIndex(line);
  const endIndex = line.next ? quill.getIndex(line.next) : quill.getLength();
  
  // Return the Delta object for the line
  return quill.getContents(startIndex, endIndex - startIndex);
};

/**
 * Gets all line contents from the editor as an array of Delta objects
 */
export const getAllLineContents = (quill: any): any[] => {
  if (!quill) return [];
  
  const lines = quill.getLines(0);
  return lines.map(line => getLineContent(line, quill));
};
