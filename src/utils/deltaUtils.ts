
import { createClient } from '@supabase/supabase-js';
import { DeltaStatic } from 'quill';
import { supabase } from '@/integrations/supabase/client';
import { DeltaContent } from '@/utils/editor/types';
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
 * Load content from script_content table
 */
export const loadContent = async (scriptId: string): Promise<DeltaStatic | null> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .maybeSingle();

    if (error) throw error;

    if (!data || !data.content_delta) {
      console.log('No content found for script:', scriptId);
      return null;
    }

    const deltaContent = data.content_delta;
    
    // Convert the content to a proper Delta object
    return toDelta(deltaContent);
  } catch (error) {
    console.error('Error loading content:', error);
    return null;
  }
};

/**
 * Save content to script_content table
 */
export const saveContent = async (scriptId: string, content: DeltaStatic | any): Promise<boolean> => {
  try {
    // Convert content to proper format if needed
    const normalizedContent = normalizeContentForStorage(content);

    // Check if content already exists
    const { data, error: fetchError } = await supabase
      .from('script_content')
      .select('script_id')
      .eq('script_id', scriptId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw fetchError;
    }

    if (data) {
      // Update existing content
      const { error: updateError } = await supabase
        .from('script_content')
        .update({ 
          content_delta: normalizedContent,
          updated_at: new Date().toISOString()
        })
        .eq('script_id', scriptId);

      if (updateError) throw updateError;
    } else {
      // Create new content
      const { error: insertError } = await supabase
        .from('script_content')
        .insert({
          script_id: scriptId,
          content_delta: normalizedContent
        });

      if (insertError) throw insertError;
    }

    return true;
  } catch (error) {
    console.error('Error saving content:', error);
    return false;
  }
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
      
      // If the string contains HTML tags, we need to create a proper Delta
      if (value.includes('<')) {
        console.warn('HTML detected in Delta string - converting to plain text');
        // Create a basic Delta with the text content only
        return { ops: [{ insert: value.replace(/<[^>]*>/g, '') + '\n' }] };
      }
      
      // Regular string
      return { ops: [{ insert: value + '\n' }] };
    } catch {
      // Not valid JSON, treat as plain text
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
    // Use "as any" to work around TypeScript issues with the Delta constructor
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
  
  // If it's an HTML string, warn and convert to plain text
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
      return JSON.parse(content);
    } catch {
      return { ops: [{ insert: content + '\n' }] };
    }
  }
  
  // Default fallback
  return { ops: [{ insert: '\n' }] };
};

/**
 * Save a suggestion to script_suggestions table
 */
export const saveSuggestion = async (
  scriptId: string,
  userId: string,
  deltaContent: DeltaStatic | DeltaContent
): Promise<boolean> => {
  try {
    // Normalize content for storage
    const normalizedContent = normalizeContentForStorage(deltaContent);
    
    const { error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: normalizedContent,
        status: 'pending',
        created_at: new Date().toISOString()
      });
      
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error('Error saving suggestion:', error);
    return false;
  }
};

// Adding alias for createSuggestion to fix import reference
export const createSuggestion = saveSuggestion;
