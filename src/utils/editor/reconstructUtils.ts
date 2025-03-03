/**
 * Utilities for reconstructing content from line data
 */
import { isDeltaObject } from './deltaUtils';
import { extractPlainTextFromDelta } from './contentUtils';

/**
 * Reconstructs content from line data, preserving formatting
 */
export const reconstructContent = (lineData: Array<{ content: string | any }>): any => {
  try {
    // For first load, if we have a single line of plain text, return it directly
    if (lineData.length === 1 && typeof lineData[0].content === 'string' && 
        !lineData[0].content.includes('\n')) {
      return lineData[0].content;
    }
    
    // Build combined ops from all lines
    const ops: any[] = [];
    
    lineData.forEach(line => {
      if (!line.content) return;
      
      try {
        // If content is a Delta object, add its ops
        if (typeof line.content === 'object' && line.content.ops) {
          ops.push(...line.content.ops);
        }
        // If content is a stringified Delta, parse and add its ops
        else if (typeof line.content === 'string' && 
                line.content.startsWith('{') && 
                line.content.includes('ops')) {
          try {
            const delta = JSON.parse(line.content);
            if (delta && delta.ops) {
              ops.push(...delta.ops);
            }
          } catch (e) {
            // If parsing fails, add as plain text
            ops.push({ insert: line.content + '\n' });
          }
        }
        // Otherwise, add as plain text
        else {
          ops.push({ insert: (typeof line.content === 'string' ? line.content : String(line.content)) + '\n' });
        }
      } catch (e) {
        // Fallback: add as plain text
        ops.push({ insert: (typeof line.content === 'string' ? line.content : String(line.content)) + '\n' });
      }
    });
    
    // Return a proper Delta object
    return { ops };
  } catch (error) {
    console.error('Error reconstructing content:', error);
    // Fallback to joining strings
    return lineData.map(line => 
      typeof line.content === 'string' ? line.content : String(line.content)
    ).join('\n');
  }
};
