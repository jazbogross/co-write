
import { DeltaStatic } from 'quill';
import { DeltaContent } from './editor/types';
import Delta from 'quill-delta';
import { normalizeContentForStorage } from './suggestions/contentUtils';

/**
 * Convert a DeltaStatic to a DeltaContent
 */
export const toDelta = (content: any): DeltaStatic => {
  // If it's already a DeltaStatic with compose method, return it
  if (content && typeof content.compose === 'function') {
    return content;
  }
  
  // If it's a DeltaContent with ops, create a new Delta
  if (content && content.ops && Array.isArray(content.ops)) {
    return new Delta(content.ops) as unknown as DeltaStatic;
  }
  
  // If it's a string that might be JSON
  if (typeof content === 'string') {
    try {
      const parsed = JSON.parse(content);
      if (parsed && parsed.ops && Array.isArray(parsed.ops)) {
        return new Delta(parsed.ops) as unknown as DeltaStatic;
      }
    } catch (e) {
      // Not a valid JSON Delta
    }
  }
  
  // Fallback to empty Delta
  return new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
};

/**
 * Convert a DeltaStatic to a JSON-serializable object for storage
 */
export const toJSON = (delta: DeltaStatic): any => {
  return normalizeContentForStorage(delta);
};

/**
 * Ensure a value is a DeltaContent
 */
export const ensureDeltaContent = (value: any): DeltaContent => {
  // If it's already a DeltaContent with ops array, return it
  if (value && value.ops && Array.isArray(value.ops)) {
    return value as DeltaContent;
  }
  
  // If it's a DeltaStatic, extract its ops
  if (value && typeof value.compose === 'function') {
    return { ops: value.ops || [] };
  }
  
  // If it's a string that might be JSON
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && parsed.ops && Array.isArray(parsed.ops)) {
        return parsed as DeltaContent;
      }
    } catch (e) {
      // Not a valid JSON Delta
    }
  }
  
  // Fallback to empty DeltaContent
  return { ops: [{ insert: '\n' }] };
};

/**
 * Create a suggestion for a script
 */
export const createSuggestion = async (
  scriptId: string, 
  userId: string,
  deltaDiff: any
): Promise<string | null> => {
  try {
    // Normalize delta for Supabase's JSON storage
    const normalizedDelta = normalizeContentForStorage(deltaDiff);
    
    // Save to database
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: normalizedDelta,
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
 * Load content from the database
 */
export const loadContent = async (scriptId: string): Promise<DeltaStatic | null> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .maybeSingle();
    
    if (error) {
      console.error('Error loading content:', error);
      return null;
    }
    
    if (!data?.content_delta) {
      console.error('No content found for script:', scriptId);
      return new Delta([{ insert: '\n' }]) as unknown as DeltaStatic;
    }
    
    // Parse Delta content if needed
    return toDelta(data.content_delta);
  } catch (error) {
    console.error('Error in loadContent:', error);
    return null;
  }
};

/**
 * Saves content to the database as a full Delta
 */
export const saveContent = async (
  scriptId: string,
  content: string | DeltaStatic | DeltaContent
): Promise<boolean> => {
  try {
    // Convert content to appropriate format
    const normalizedContent = normalizeContentForStorage(content);
    
    // First check if content exists
    const { data: existingData, error: checkError } = await supabase
      .from('script_content')
      .select('content_delta')
      .eq('script_id', scriptId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing content:', checkError);
      return false;
    }
    
    // If no content exists, create it
    if (!existingData) {
      const { error: insertError } = await supabase
        .from('script_content')
        .insert({
          script_id: scriptId,
          content_delta: normalizedContent,
          updated_at: new Date().toISOString(),
          version: 1
        });
      
      if (insertError) {
        console.error('Error creating content:', insertError);
        return false;
      }
    } else {
      // If content exists, update it
      const { error: updateError } = await supabase
        .from('script_content')
        .update({
          content_delta: normalizedContent,
          updated_at: new Date().toISOString()
        })
        .eq('script_id', scriptId);
      
      if (updateError) {
        console.error('Error updating content:', updateError);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveContent:', error);
    return false;
  }
};

// Import needed for the function below
import { supabase } from '@/integrations/supabase/client';

// Add missing functions
/**
 * Fetch suggestions for a script
 */
export const fetchSuggestions = async (scriptId: string): Promise<any[]> => {
  try {
    const { data, error } = await supabase
      .from('script_suggestions')
      .select('*, profiles(*)')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSuggestions:', error);
    return [];
  }
};

/**
 * Fetch user profiles by ID
 */
export const fetchUserProfiles = async (userIds: string[]): Promise<Record<string, string>> => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds);
    
    if (error) {
      console.error('Error fetching user profiles:', error);
      return {};
    }
    
    // Map user IDs to usernames
    const usernameMap: Record<string, string> = {};
    data?.forEach(profile => {
      usernameMap[profile.id] = profile.username || 'Unknown User';
    });
    
    return usernameMap;
  } catch (error) {
    console.error('Error in fetchUserProfiles:', error);
    return {};
  }
};

/**
 * Fetch original content for comparison
 */
export const fetchOriginalContent = async (scriptId: string): Promise<DeltaStatic | null> => {
  return loadContent(scriptId);
};
