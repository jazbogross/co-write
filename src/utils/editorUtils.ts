
/**
 * Utilities for working with Quill Editor
 */
import { isDeltaObject } from './editor/deltaUtils';
import { extractPlainTextFromDelta } from './editor/content/textExtraction';

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
