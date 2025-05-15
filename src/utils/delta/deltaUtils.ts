import { createClient } from '@supabase/supabase-js';
import { DeltaStatic, DeltaContent } from '@/utils/editor/quill-types';
import { supabase } from '@/integrations/supabase/client';
import Delta from 'quill-delta';

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
 * Load content from scripts table
 */
export const loadContent = async (scriptId: string): Promise<DeltaStatic | null> => {
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('content')
      .eq('id', scriptId)
      .maybeSingle();

    if (error) throw error;

    if (!data || !data.content) {
      console.log('No content found for script:', scriptId);
      return null;
    }

    const deltaContent = data.content;
    
    // Convert the content to a proper Delta object
    return toDelta(deltaContent);
  } catch (error) {
    console.error('Error loading content:', error);
    return null;
  }
};

/**
 * Save content to scripts table
 */
export const saveContent = async (scriptId: string, content: DeltaStatic | any): Promise<boolean> => {
  try {
    // Convert content to proper format if needed
    const normalizedContent = normalizeContentForStorage(content);

    // Update scripts table
    const { error: updateError } = await supabase
      .from('scripts')
      .update({ 
        content: normalizedContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId);

    if (updateError) throw updateError;
    return true;
  } catch (error) {
    console.error('Error saving content:', error);
    return false;
  }
};

/**
 * Create a suggestion by comparing with the original Delta
 */
export const createSuggestion = async (
  scriptId: string, 
  originalDelta: DeltaStatic, 
  suggestedDelta: DeltaStatic
): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Create a diff between original and suggested deltas
    const deltaOps = originalDelta.diff(suggestedDelta);
    const deltaJson = toJSON(deltaOps);
    
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: user.id,
        delta_diff: deltaJson,
        status: 'pending'
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating suggestion:', error);
      return null;
    }

    return data.id;
  } catch (error) {
    console.error('Error in createSuggestion:', error);
    return null;
  }
};

/**
 * Check if current content is empty
 */
export const isContentEmpty = (content: any): boolean => {
  // For null/undefined content
  if (!content) return true;
  
  // If it's a string, check if it's empty after trimming
  if (typeof content === 'string') return content.trim() === '';
  
  // Check if it's a Delta object with empty content
  if (content && typeof content === 'object' && 'ops' in content) {
    // Check if it only has a newline or empty insert
    if (content.ops.length === 0) return true;
    
    if (content.ops.length === 1) {
      const op = content.ops[0];
      return op.insert === '\n' || op.insert === '';
    }
    
    // Extract text content to check if it's empty
    let text = '';
    content.ops.forEach((op: any) => {
      if (typeof op.insert === 'string') {
        text += op.insert;
      }
    });
    return text.trim() === '';
  }
  
  return false;
};

/**
 * Extract plain text from a Delta object
 */
export const extractPlainText = (content: any): string => {
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
