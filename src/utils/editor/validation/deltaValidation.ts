/**
 * Functions for validating Delta content structures
 */
import { DeltaContent, DeltaValidationResult } from '../types';

/**
 * Validates a value as a Delta object
 */
export const validateDelta = (content: any): DeltaValidationResult => {
  const originalType = typeof content;
  
  // Handle null or undefined
  if (content === null || content === undefined) {
    return {
      valid: false,
      originalType,
      reason: 'Content is null or undefined'
    };
  }
  
  // Handle string (parse JSON)
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      // Recursively validate the parsed content
      const parsedValidation = validateDelta(parsed);
      if (parsedValidation.valid) {
        return {
          valid: true,
          originalType: 'string (parsed JSON)',
          parsed: parsedValidation.parsed
        };
      } else {
        return {
          valid: false,
          originalType,
          reason: `Invalid Delta JSON: ${parsedValidation.reason}`
        };
      }
    } catch (error) {
      return {
        valid: false,
        originalType,
        reason: 'Invalid JSON string'
      };
    }
  }
  
  // Handle object
  if (typeof content === 'object') {
    // Must have 'ops' property
    if (!('ops' in content)) {
      return {
        valid: false,
        originalType,
        reason: 'Object missing "ops" property'
      };
    }
    
    // 'ops' must be an array
    if (!Array.isArray(content.ops)) {
      return {
        valid: false,
        originalType,
        reason: '"ops" property is not an array'
      };
    }
    
    // If object is a proper Delta, allow it through
    return {
      valid: true,
      originalType,
      parsed: content
    };
  }
  
  // Other types are invalid
  return {
    valid: false,
    originalType,
    reason: `Invalid type: ${originalType}`
  };
};

/**
 * Checks if a Delta has valid operations
 */
export const hasValidOperations = (delta: DeltaContent): boolean => {
  // Must have at least one operation
  if (!delta.ops || delta.ops.length === 0) {
    return false;
  }
  
  // Check each operation
  for (const op of delta.ops) {
    // At least one of insert, delete, or retain must be present
    if (!('insert' in op) && !('delete' in op) && !('retain' in op)) {
      return false;
    }
    
    // Insert must be string or object
    if ('insert' in op && typeof op.insert !== 'string' && typeof op.insert !== 'object') {
      return false;
    }
    
    // Delete and retain must be numbers
    if (('delete' in op && typeof op.delete !== 'number') || 
        ('retain' in op && typeof op.retain !== 'number')) {
      return false;
    }
  }
  
  return true;
};

/**
 * Checks if a Delta represents plain text (only string inserts)
 */
export const isPlainTextDelta = (delta: DeltaContent): boolean => {
  if (!delta.ops) return false;
  
  return delta.ops.every(op => 
    !op.delete && 
    !op.retain && 
    (op.insert === undefined || typeof op.insert === 'string')
  );
};
