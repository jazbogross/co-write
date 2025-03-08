
/**
 * Delta validation utilities
 */
import { DeltaContent, DeltaValidationResult } from '../types';

/**
 * Checks if an object is a valid Delta object
 */
export const isDeltaObject = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object') {
    return false;
  }
  
  return 'ops' in obj && Array.isArray(obj.ops);
};

/**
 * Safely parses a string that might be a stringified Delta object
 */
export const safelyParseDelta = (content: string): DeltaContent | null => {
  if (!content || typeof content !== 'string') {
    return null;
  }
  
  try {
    if (content.startsWith('{') && content.includes('"ops"')) {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.ops)) {
        return parsed;
      }
    }
  } catch (e) {
    // Not a valid JSON or Delta
    console.error('Failed to parse possible Delta:', e);
  }
  
  return null;
};

/**
 * Validates and potentially parses content as a Delta
 * Returns a detailed validation result
 */
export const validateDeltaContent = (content: any): DeltaValidationResult => {
  const result: DeltaValidationResult = {
    valid: false,
    originalType: typeof content
  };
  
  // Already a Delta object
  if (isDeltaObject(content)) {
    result.valid = true;
    result.parsed = content;
    return result;
  }
  
  // Try to parse from string
  if (typeof content === 'string') {
    try {
      const parsed = safelyParseDelta(content);
      if (parsed) {
        result.valid = true;
        result.parsed = parsed;
        return result;
      } else {
        result.reason = 'String is not a valid Delta format';
      }
    } catch (e) {
      result.reason = `Parse error: ${e}`;
    }
  } else {
    result.reason = `Not a Delta object or string: ${typeof content}`;
  }
  
  return result;
};
