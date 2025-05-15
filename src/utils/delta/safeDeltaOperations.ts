import Delta from 'quill-delta';
import { DeltaStatic } from '@/utils/editor/quill-types';

/**
 * Safely converts any value to a Delta object
 */
export const safeToDelta = (value: any): DeltaStatic => {
  // If it's already a Delta instance with compose method, return it directly
  if (value && typeof value.compose === 'function') {
    return value;
  }
  
  // If it's an object with ops property that's an array
  if (value && typeof value === 'object' && 'ops' in value && Array.isArray(value.ops)) {
    return new Delta(value.ops) as unknown as DeltaStatic;
  }
  
  // If it's a string that might be a JSON Delta
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 
          'ops' in parsed && Array.isArray(parsed.ops)) {
        return new Delta(parsed.ops) as unknown as DeltaStatic;
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }
  
  // Default fallback - empty Delta with a newline
  return new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
};

/**
 * Extracts ops from any value that might represent a Delta, with type safety
 */
export const safeGetOps = (value: any): any[] => {
  // If it's a Delta instance
  if (value && typeof value.compose === 'function' && value.ops) {
    return Array.isArray(value.ops) ? value.ops : [{ insert: '\n' }];
  }
  
  // If it's an object with ops property
  if (value && typeof value === 'object' && 'ops' in value) {
    return Array.isArray(value.ops) ? value.ops : [{ insert: '\n' }];
  }
  
  // If it's a string that might be a JSON Delta
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
        return Array.isArray(parsed.ops) ? parsed.ops : [{ insert: '\n' }];
      }
    } catch (e) {
      // Not valid JSON, ignore
    }
  }
  
  // Default fallback
  return [{ insert: '\n' }];
};
