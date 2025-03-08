
/**
 * Delta operations utilities
 */
import { DeltaContent, DeltaOp } from '../types';

/**
 * Creates an empty Delta object
 */
export const createEmptyDelta = (): DeltaContent => {
  return { ops: [{ insert: '\n' }] };
};

/**
 * Creates a Delta with a single insert operation
 */
export const createTextDelta = (text: string): DeltaContent => {
  return { ops: [{ insert: text }] };
};

/**
 * Creates a Delta with formatting attributes
 */
export const createFormattedDelta = (text: string, attributes: Record<string, any>): DeltaContent => {
  return { ops: [{ insert: text, attributes }] };
};

/**
 * Safely converts a string to a Delta if it appears to be a stringified Delta
 */
export const parseDeltaIfPossible = (content: string | any): DeltaContent => {
  // If already a Delta object with ops, return it
  if (content && typeof content === 'object' && content.ops && Array.isArray(content.ops)) {
    return content;
  }
  
  // If a string that looks like a stringified Delta, try to parse it
  if (typeof content === 'string' && content.startsWith('{') && content.includes('"ops"')) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.ops)) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse Delta JSON:', e);
    }
  }
  
  // If not a Delta, create a simple text Delta
  const text = typeof content === 'string' ? content : String(content);
  return createTextDelta(text);
};
