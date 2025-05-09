
/**
 * Consolidated utilities for working with Delta objects
 */
import { createClient } from '@supabase/supabase-js';
import { DeltaStatic } from 'quill';
import { supabase } from '@/integrations/supabase/client';
import { DeltaContent } from '@/utils/editor/types';
import Delta from 'quill-delta';

/**
 * Check if a value is a Delta object
 */
export const isDeltaObject = (value: any): boolean => {
  return (
    value !== null &&
    typeof value === 'object' &&
    'ops' in value &&
    Array.isArray(value.ops)
  );
};

/**
 * Extract plain text from a Delta object
 */
export const extractPlainTextFromDelta = (content: any): string => {
  // For null/undefined content
  if (!content) return '';
  
  // If it's a string, return it directly
  if (typeof content === 'string') return content;
  
  // Check if it has ops array (Delta object)
  if (content && Array.isArray(content.ops)) {
    let text = '';
    
    // Process each op to extract text
    content.ops.forEach((op: any) => {
      if (op.insert) {
        if (typeof op.insert === 'string') {
          text += op.insert;
        } else if (typeof op.insert === 'object') {
          // Handle embeds like images
          text += ' ';
        }
      }
    });
    
    return text;
  }
  
  // Fallback: stringify the object
  try {
    return JSON.stringify(content);
  } catch (e) {
    return String(content);
  }
};

/**
 * Convert Delta object to JSON for storage
 */
export const toJSON = (delta: DeltaStatic | any): Record<string, any> => {
  if (!delta) {
    return { ops: [{ insert: '\n' }] };
  }
  
  // If it's already a plain object or JSON string
  if (typeof delta !== 'object' || !delta.ops) {
    try {
      // Try to parse if it's a string
      if (typeof delta === 'string') {
        // Check if it's an HTML string
        if (delta.includes('<')) {
          console.warn('HTML detected in delta - converting to plain text');
          return { ops: [{ insert: delta.replace(/<[^>]*>/g, '') + '\n' }] };
        }
        return JSON.parse(delta);
      }
      return { ops: [{ insert: String(delta) + '\n' }] };
    } catch (e) {
      return { ops: [{ insert: '\n' }] };
    }
  }
  
  // Return a plain object copy for JSON serialization
  return JSON.parse(JSON.stringify(delta));
};

/**
 * Ensure the value is a valid Delta content object
 */
export const ensureDeltaContent = (value: any): DeltaContent => {
  if (!value) {
    return { ops: [{ insert: '\n' }] };
  }
  
  // If it's already a Delta object with ops property
  if (value.ops) {
    return value;
  }
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    try {
      // Check if it's a JSON string representing a Delta
      const parsed = JSON.parse(value);
      if (parsed.ops) {
        return parsed;
      }
      
      // If the string contains HTML tags, convert to plain text
      if (value.includes('<')) {
        console.warn('HTML detected in Delta string - converting to plain text');
        return { ops: [{ insert: value.replace(/<[^>]*>/g, '') + '\n' }] };
      }
      
      // Regular string
      return { ops: [{ insert: value + '\n' }] };
    } catch {
      // Not valid JSON, treat as plain text
      // Check if it's HTML content
      if (value.includes('<')) {
        console.warn('HTML detected in content string - converting to plain text');
        return { ops: [{ insert: value.replace(/<[^>]*>/g, '') + '\n' }] };
      }
      return { ops: [{ insert: value + '\n' }] };
    }
  }
  
  // Default fallback
  return { ops: [{ insert: '\n' }] };
};

/**
 * Convert any content to a proper DeltaStatic type
 */
export const toDelta = (content: any): DeltaStatic => {
  const deltaContent = ensureDeltaContent(content);
  
  // Ensure we're creating a proper Delta instance
  try {
    // Create a new Delta instance
    const delta = new Delta(deltaContent.ops as any);
    return delta as unknown as DeltaStatic;
  } catch (e) {
    console.error('Error converting to Delta:', e);
    return new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
  }
};

/**
 * Normalize content for storage in Supabase 
 * This helps avoid type issues with DeltaStatic vs JSON
 */
export const normalizeContentForStorage = (content: any): Record<string, any> => {
  if (!content) {
    return { ops: [{ insert: '\n' }] };
  }
  
  // Handle HTML content by converting to plain text
  if (typeof content === 'string' && content.includes('<')) {
    console.warn('HTML detected in content - converting to plain text');
    return { ops: [{ insert: content.replace(/<[^>]*>/g, '') + '\n' }] };
  }
  
  // If it's a Delta object or has the ops property
  if (content.ops) {
    // Convert to plain object to avoid issues with Supabase JSON storage
    return JSON.parse(JSON.stringify(content));
  }
  
  // If it's a string, try to parse it
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      // Check if parsed content contains HTML
      if (typeof parsed === 'string' && parsed.includes('<')) {
        console.warn('HTML detected in parsed content - converting to plain text');
        return { ops: [{ insert: parsed.replace(/<[^>]*>/g, '') + '\n' }] };
      }
      return parsed;
    } catch {
      return { ops: [{ insert: content + '\n' }] };
    }
  }
  
  // Default fallback
  return { ops: [{ insert: '\n' }] };
};

/**
 * Log the structure of a Delta for debugging
 */
export const logDeltaStructure = (delta: any, label = 'Delta'): void => {
  console.log(`---- ${label} Structure ----`);
  if (!delta) {
    console.log('Null or undefined delta');
    return;
  }
  
  console.log(`Type: ${typeof delta}`);
  if (isDeltaObject(delta)) {
    console.log(`Ops count: ${delta.ops.length}`);
    console.log('First 3 ops:', delta.ops.slice(0, 3));
  } else {
    console.log('Not a valid Delta object');
    console.log('Value:', delta);
  }
};

/**
 * Safely parse a delta from various formats
 */
export const safelyParseDelta = (content: any): DeltaContent => {
  // Already a Delta object
  if (isDeltaObject(content)) {
    return content;
  }
  
  // Try to parse as JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (isDeltaObject(parsed)) {
        return parsed;
      }
    } catch (e) {
      // Not valid JSON, treat as plain text
    }
    
    // Plain text - convert to Delta
    return {
      ops: [{ insert: content }]
    };
  }
  
  // Fallback to empty Delta
  return {
    ops: [{ insert: '\n' }]
  };
};
