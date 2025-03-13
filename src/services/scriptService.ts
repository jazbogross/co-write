
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';
import { 
  ScriptContent,
  ScriptSuggestion,
  ScriptDraft,
  ScriptVersion
} from '@/types/lineTypes';
import { toDelta, toJSON } from '@/utils/deltaUtils';

/**
 * Fetch script content as a Delta object
 */
export const fetchScriptContent = async (scriptId: string): Promise<ScriptContent | null> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('content_delta, version')
      .eq('script_id', scriptId)
      .single();

    if (error) {
      console.error('Error fetching script content:', error);
      return null;
    }

    if (!data) return null;

    return {
      scriptId,
      contentDelta: toDelta(data.content_delta),
      version: data.version
    };
  } catch (error) {
    console.error('Error in fetchScriptContent:', error);
    return null;
  }
};

/**
 * Save script content as Delta
 */
export const saveScriptContent = async (
  scriptId: string, 
  content: DeltaStatic, 
  isAdmin: boolean = false
): Promise<boolean> => {
  try {
    // Convert the Delta to a format suitable for database storage
    const contentJson = toJSON(content);
    
    // Get current user for version history
    const { data: { user } } = await supabase.auth.getUser();
    
    // Determine current version
    const { data: currentContent } = await supabase
      .from('script_content')
      .select('version')
      .eq('script_id', scriptId)
      .single();
    
    const newVersion = isAdmin ? (currentContent?.version || 0) + 1 : (currentContent?.version || 0);
    
    // Update script content
    const { error } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: contentJson,
        version: newVersion,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'script_id'
      });

    if (error) {
      console.error('Error saving script content:', error);
      return false;
    }

    // Store a version history if an admin is making the change
    if (isAdmin) {
      try {
        await supabase
          .from('script_versions')
          .insert({
            script_id: scriptId,
            version_number: newVersion,
            content_delta: contentJson,
            created_by: user?.id
          });
      } catch (versionError) {
        console.error('Error saving version history:', versionError);
        // Don't fail the overall operation if version history fails
      }
    }

    return true;
  } catch (error) {
    console.error('Error in saveScriptContent:', error);
    return false;
  }
};

/**
 * Get the current version number for a script
 */
export const getCurrentVersion = async (scriptId: string): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('version')
      .eq('script_id', scriptId)
      .single();

    if (error) {
      console.error('Error fetching script version:', error);
      return 1;
    }

    return data?.version || 1;
  } catch (error) {
    console.error('Error in getCurrentVersion:', error);
    return 1;
  }
};

/**
 * Save a user's draft for a script
 */
export const saveDraft = async (scriptId: string, content: DeltaStatic): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const contentJson = toJSON(content);
    
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: user.id,
        draft_content: contentJson,
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
    console.error('Error in saveDraft:', error);
    return false;
  }
};

/**
 * Load a user's draft for a script
 */
export const loadDraft = async (scriptId: string): Promise<ScriptDraft | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('script_drafts')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', user.id)
      .single();

    if (error) {
      // If no draft exists, that's not an error for us
      if (error.code === 'PGRST116') return null;
      
      console.error('Error loading draft:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      scriptId: data.script_id,
      userId: data.user_id,
      draftContent: toDelta(data.draft_content),
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in loadDraft:', error);
    return null;
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
 * Get all suggestions for a script
 */
export const getScriptSuggestions = async (scriptId: string): Promise<ScriptSuggestion[]> => {
  try {
    const { data, error } = await supabase
      .from('script_suggestions')
      .select(`
        *,
        profiles:user_id(username)
      `)
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching script suggestions:', error);
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
    console.error('Error in getScriptSuggestions:', error);
    return [];
  }
};

/**
 * Approve a suggestion by applying the diff to the script content
 */
export const approveSuggestion = async (suggestionId: string): Promise<boolean> => {
  try {
    // Get the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('script_suggestions')
      .select('*')
      .eq('id', suggestionId)
      .single();

    if (suggestionError) {
      console.error('Error fetching suggestion:', suggestionError);
      return false;
    }

    // Get the current script content
    const { data: scriptContent, error: scriptError } = await supabase
      .from('script_content')
      .select('content_delta, version')
      .eq('script_id', suggestion.script_id)
      .single();

    if (scriptError) {
      console.error('Error fetching script content:', scriptError);
      return false;
    }

    // Convert to Delta objects
    const currentDelta = toDelta(scriptContent.content_delta);
    const diffDelta = toDelta(suggestion.delta_diff);

    // Compose the deltas to get the new content
    const newDelta = currentDelta.compose(diffDelta);
    const newDeltaJson = toJSON(newDelta);

    // Update the script content with the new delta
    const { error: updateContentError } = await supabase
      .from('script_content')
      .update({
        content_delta: newDeltaJson,
        version: scriptContent.version + 1,
        updated_at: new Date().toISOString()
      })
      .eq('script_id', suggestion.script_id);

    if (updateContentError) {
      console.error('Error updating script content:', updateContentError);
      return false;
    }

    // Update the suggestion status
    const { error: updateSuggestionError } = await supabase
      .from('script_suggestions')
      .update({
        status: 'approved',
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (updateSuggestionError) {
      console.error('Error updating suggestion status:', updateSuggestionError);
      return false;
    }

    // Save a version history record
    const { error: versionError } = await supabase
      .from('script_versions')
      .insert({
        script_id: suggestion.script_id,
        version_number: scriptContent.version + 1,
        content_delta: newDeltaJson,
        created_by: suggestion.user_id  // Credit the suggestion author
      });

    if (versionError) {
      console.error('Error creating version history:', versionError);
      // Don't fail the overall operation if version history fails
    }

    return true;
  } catch (error) {
    console.error('Error in approveSuggestion:', error);
    return false;
  }
};

/**
 * Reject a suggestion
 */
export const rejectSuggestion = async (suggestionId: string, reason: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('script_suggestions')
      .update({
        status: 'rejected',
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', suggestionId);

    if (error) {
      console.error('Error rejecting suggestion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in rejectSuggestion:', error);
    return false;
  }
};
