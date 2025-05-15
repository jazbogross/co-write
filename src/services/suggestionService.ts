
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from '@/utils/editor/quill-types';
import Delta from 'quill-delta';
import { normalizeContentForStorage, toDelta, toJSON } from '@/utils/deltaUtils';
import { ScriptSuggestion } from '@/types/lineTypes';

/**
 * Fetch all suggestions for a script
 */
export const fetchSuggestions = async (scriptId: string): Promise<ScriptSuggestion[]> => {
  try {
    // Fetch suggestions
    const { data, error } = await supabase
      .from('script_suggestions')
      .select(`
        id,
        script_id,
        user_id,
        delta_diff,
        status,
        rejection_reason,
        created_at,
        updated_at,
        profiles:user_id(username)
      `)
      .eq('script_id', scriptId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
  
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(suggestion => ({
      id: suggestion.id,
      scriptId: suggestion.script_id,
      userId: suggestion.user_id,
      deltaDiff: toDelta(suggestion.delta_diff),
      status: suggestion.status as 'pending' | 'approved' | 'rejected' | 'draft',
      rejectionReason: suggestion.rejection_reason,
      createdAt: suggestion.created_at,
      updatedAt: suggestion.updated_at
    }));
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
};

/**
 * Fetch original content for a script
 */
export const fetchOriginalContent = async (scriptId: string): Promise<DeltaStatic> => {
  try {
    const { data, error } = await supabase
      .from('scripts')
      .select('content')
      .eq('id', scriptId)
      .single();
    
    if (error) throw error;
    
    // Create a proper Delta object from content
    if (data?.content) {
      return toDelta(data.content);
    }
    
    // Default to empty content with newline
    return toDelta({ ops: [{ insert: '\n' }] });
  } catch (error) {
    console.error('Error fetching original content:', error);
    // Default to empty content with newline
    return toDelta({ ops: [{ insert: '\n' }] });
  }
};

/**
 * Create a suggestion
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
    
    // Save the suggestion
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: user.id,
        delta_diff: deltaJson,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
      
    if (error) {
      console.error('Error creating suggestion:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error creating suggestion:', error);
    return null;
  }
};

/**
 * Approve a suggestion
 */
export const approveSuggestion = async (
  scriptId: string,
  suggestionId: string,
  originalContent: DeltaStatic
): Promise<boolean> => {
  try {
    // Get the suggestion diff
    const { data: suggestion, error: suggestionError } = await supabase
      .from('script_suggestions')
      .select('delta_diff')
      .eq('id', suggestionId)
      .single();
      
    if (suggestionError) throw suggestionError;
    
    // Create proper Delta instances to ensure compose works correctly
    const originalDelta = new Delta(originalContent.ops || []);
    
    // Handle suggestion delta_diff properly
    let diffOps;
    
    // Safely extract ops from delta_diff, handling various possible formats
    if (suggestion.delta_diff && typeof suggestion.delta_diff === 'object') {
      if ('ops' in suggestion.delta_diff && Array.isArray(suggestion.delta_diff.ops)) {
        diffOps = suggestion.delta_diff.ops;
      } else {
        console.warn('delta_diff does not have expected ops array, using default');
        diffOps = [{ insert: '\n' }];
      }
    } else {
      console.warn('Invalid delta_diff format, using default');
      diffOps = [{ insert: '\n' }];
    }
    
    const diffDelta = new Delta(diffOps);
    
    // Compose the deltas to get the new content
    const newContent = originalDelta.compose(diffDelta);
    
    // Convert to plain object for storage
    const newContentObj = toJSON(newContent);
    
    // Update the scripts table with the new content
    const { error: updateError } = await supabase
      .from('scripts')
      .update({ 
        content: newContentObj,
        updated_at: new Date().toISOString()
      })
      .eq('id', scriptId);
  
    if (updateError) throw updateError;
    
    // Save version history
    await supabase
      .from('script_versions')
      .insert({
        script_id: scriptId,
        version_number: 1,
        content_delta: newContentObj,
        created_at: new Date().toISOString()
      });
  
    // Update suggestion status
    const { error: statusError } = await supabase
      .from('script_suggestions')
      .update({ 
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);
  
    if (statusError) throw statusError;
    
    return true;
  } catch (error) {
    console.error('Error approving suggestion:', error);
    return false;
  }
};

/**
 * Reject a suggestion
 */
export const rejectSuggestion = async (
  suggestionId: string,
  reason: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('script_suggestions')
      .update({ 
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);
  
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error rejecting suggestion:', error);
    return false;
  }
};

/**
 * Save a draft
 */
export const saveDraft = async (
  scriptId: string,
  content: DeltaStatic
): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    
    // Normalize content for storage
    const normalizedContent = normalizeContentForStorage(content);
    
    // Update or insert the draft
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: user.id,
        draft_content: normalizedContent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id,user_id'
      });
      
    if (error) {
      console.error('Error saving draft:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving draft:', error);
    return false;
  }
};

/**
 * Load a draft
 */
export const loadDraft = async (
  scriptId: string
): Promise<DeltaStatic | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    
    const { data, error } = await supabase
      .from('script_drafts')
      .select('draft_content')
      .eq('script_id', scriptId)
      .eq('user_id', user.id)
      .maybeSingle();
      
    if (error) {
      // If no draft exists, that's not an error for us
      if (error.code === 'PGRST116') return null;
      
      console.error('Error loading draft:', error);
      return null;
    }
    
    if (!data || !data.draft_content) return null;
    
    return toDelta(data.draft_content);
  } catch (error) {
    console.error('Error loading draft:', error);
    return null;
  }
};
