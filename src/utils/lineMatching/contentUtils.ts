
import { DeltaStatic } from '@/types/lineTypes';

// Helper to check if content is empty
export const isContentEmpty = (content: any): boolean => {
  if (!content) return true;
  
  if (typeof content === 'string') {
    return content.trim() === '';
  }
  
  // Check if it's a Delta object with empty content
  if (content && typeof content === 'object' && 'ops' in content) {
    // Check if it only has a newline or empty insert
    if (content.ops.length === 0) return true;
    
    if (content.ops.length === 1) {
      const op = content.ops[0];
      return op.insert === '\n' || op.insert === '';
    }
    
    // Get plain text from Delta
    return getPlainTextContent(content).trim() === '';
  }
  
  return false;
};

// Extract plain text from Delta for comparison
export const getPlainTextContent = (content: any): string => {
  if (!content) return '';
  
  if (typeof content === 'string') {
    return content;
  }
  
  // Handle Delta objects
  if (content && typeof content === 'object' && 'ops' in content) {
    let text = '';
    for (const op of content.ops) {
      if (typeof op.insert === 'string') {
        text += op.insert;
      } else if (op.insert && typeof op.insert === 'object') {
        // Handle images or other embeds
        text += '[embedded content]';
      }
    }
    return text;
  }
  
  return String(content);
};
