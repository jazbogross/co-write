
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
    // Check if we have any Delta content to preserve
    const hasFormattedContent = lineData.some(line => 
      isDeltaObject(line.content)
    );
    
    // If no formatted content, just return plain text
    if (!hasFormattedContent) {
      return lineData.map(line => 
        typeof line.content === 'string' ? line.content : String(line.content)
      ).join('\n');
    }
    
    // Build combined ops from all lines
    const ops: any[] = [];
    
    lineData.forEach((line, index) => {
      if (!line.content) return;
      
      try {
        // If content is a Delta object, add its ops
        if (typeof line.content === 'object' && line.content.ops) {
          ops.push(...line.content.ops);
          
          // Make sure last op has a newline if not already present
          const lastOp = line.content.ops[line.content.ops.length - 1];
          if (lastOp && typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n') && index < lineData.length - 1) {
            ops.push({ insert: '\n' });
          }
        }
        // If content is a stringified Delta, parse and add its ops
        else if (typeof line.content === 'string' && 
                line.content.startsWith('{') && 
                line.content.includes('ops')) {
          try {
            const delta = JSON.parse(line.content);
            if (delta && delta.ops) {
              ops.push(...delta.ops);
              
              // Make sure there's a newline between lines
              const lastOp = delta.ops[delta.ops.length - 1];
              if (lastOp && typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n') && index < lineData.length - 1) {
                ops.push({ insert: '\n' });
              }
            }
          } catch (e) {
            // If parsing fails, add as plain text
            ops.push({ insert: line.content });
            if (index < lineData.length - 1) {
              ops.push({ insert: '\n' });
            }
          }
        }
        // Otherwise, add as plain text
        else {
          const content = typeof line.content === 'string' ? line.content : String(line.content);
          ops.push({ insert: content });
          if (index < lineData.length - 1 && !content.endsWith('\n')) {
            ops.push({ insert: '\n' });
          }
        }
      } catch (e) {
        // Fallback: add as plain text
        const content = typeof line.content === 'string' ? line.content : String(line.content);
        ops.push({ insert: content });
        if (index < lineData.length - 1 && !content.endsWith('\n')) {
          ops.push({ insert: '\n' });
        }
      }
    });
    
    // Return a proper Delta object
    return { ops };
  } catch (error) {
    console.error('Error reconstructing content:', error);
    // Fallback to joining strings
    return lineData.map(line => 
      typeof line.content === 'string' ? line.content : extractPlainTextFromDelta(line.content)
    ).join('\n');
  }
};
