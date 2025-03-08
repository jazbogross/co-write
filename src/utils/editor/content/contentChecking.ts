
/**
 * Utilities for checking content format and type
 */
import { DeltaContent } from '../types';
import { isDeltaObject } from '../validation/deltaValidation';
import { parseDeltaIfPossible } from '../operations/deltaOperations';

/**
 * Checks if a string might be a stringified Delta
 */
export const isStringifiedDelta = (content: string): boolean => {
  if (!content || typeof content !== 'string') {
    return false;
  }
  
  return content.trim().startsWith('{') && 
         content.includes('"ops"') && 
         content.includes('"insert"');
};

/**
 * Checks if content is either a Delta object or stringified Delta
 */
export const isAnyDelta = (content: any): boolean => {
  if (isDeltaObject(content)) {
    return true;
  }
  
  if (typeof content === 'string') {
    return isStringifiedDelta(content);
  }
  
  return false;
};

/**
 * Parses stringified Delta if possible, returns as-is otherwise
 */
export const parseAnyDelta = (content: any): DeltaContent | any => {
  if (isDeltaObject(content)) {
    return content;
  }
  
  if (typeof content === 'string' && isStringifiedDelta(content)) {
    try {
      return parseDeltaIfPossible(content);
    } catch (e) {
      console.error('Error parsing potential Delta:', e);
    }
  }
  
  return content;
};
