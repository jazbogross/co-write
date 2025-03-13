
import { supabase } from '../integrations/supabase/client';
import { DeltaStatic } from 'quill';
import { ScriptContent, ScriptSuggestion, ScriptDraft, ScriptVersion } from '@/types/lineTypes';
import Delta from 'quill-delta';

/**
 * Helper function to convert between different Delta formats
 */
const convertToDeltaStatic = (delta: any): DeltaStatic => {
  return new Delta(delta) as unknown as DeltaStatic;
};

const convertToJson = (delta: DeltaStatic): any => {
  return JSON.parse(JSON.stringify(delta));
};

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
      contentDelta: convertToDeltaStatic(data.content_delta),
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
export const saveScriptContent = async (scriptId: string, content: DeltaStatic, isAdmin: boolean = false): Promise<boolean> => {
  try {
    // Convert the Delta to a format suitable for database storage
    const contentJson = convertToJson(content);
    
    const { data, error } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: contentJson,
        version: isAdmin ? supabase.rpc('increment_script_version', { sid: scriptId }) : undefined,
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
        const { data: versionData } = await supabase
          .from('script_versions')
          .insert({
            script_id: scriptId,
            version_number: await getCurrentVersion(scriptId),
            content_delta: contentJson,
            created_by: (await supabase.auth.getUser()).data.user?.id
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return false;

    const contentJson = convertToJson(content);
    
    const { data, error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: userId,
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return null;

    const { data, error } = await supabase
      .from('script_drafts')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
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
      draftContent: convertToDeltaStatic(data.draft_content),
      updatedAt: data.updated_at
    };
  } catch (error) {
    console.error('Error in loadDraft:', error);
    return null;
  }
};

/**
 * Get all script versions
 */
export const getScriptVersions = async (scriptId: string): Promise<ScriptVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('script_versions')
      .select('*')
      .eq('script_id', scriptId)
      .order('version_number', { ascending: false });

    if (error) {
      console.error('Error fetching script versions:', error);
      return [];
    }

    return data.map(version => ({
      id: version.id,
      scriptId: version.script_id,
      versionNumber: version.version_number,
      contentDelta: convertToDeltaStatic(version.content_delta),
      createdBy: version.created_by,
      createdAt: version.created_at
    }));
  } catch (error) {
    console.error('Error in getScriptVersions:', error);
    return [];
  }
};

/**
 * Get a specific script version
 */
export const getScriptVersion = async (scriptId: string, versionNumber: number): Promise<ScriptVersion | null> => {
  try {
    const { data, error } = await supabase
      .from('script_versions')
      .select('*')
      .eq('script_id', scriptId)
      .eq('version_number', versionNumber)
      .single();

    if (error) {
      console.error('Error fetching script version:', error);
      return null;
    }

    return {
      id: data.id,
      scriptId: data.script_id,
      versionNumber: data.version_number,
      contentDelta: convertToDeltaStatic(data.content_delta),
      createdBy: data.created_by,
      createdAt: data.created_at
    };
  } catch (error) {
    console.error('Error in getScriptVersion:', error);
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
    const userId = (await supabase.auth.getUser()).data.user?.id;
    if (!userId) return null;

    // Create a diff between original and suggested deltas
    const deltaOps = originalDelta.diff(suggestedDelta);
    const deltaJson = convertToJson(deltaOps);
    
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
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
      .select('*')
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
      deltaDiff: convertToDeltaStatic(suggestion.delta_diff),
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
    const currentDelta = convertToDeltaStatic(scriptContent.content_delta);
    const diffDelta = convertToDeltaStatic(suggestion.delta_diff);

    // Compose the deltas to get the new content
    const newDelta = currentDelta.compose(diffDelta);
    const newDeltaJson = convertToJson(newDelta);

    // Start a transaction to update both tables
    const { error: updateError } = await supabase.rpc('approve_suggestion', {
      p_suggestion_id: suggestionId,
      p_new_content: newDeltaJson
    });

    if (updateError) {
      console.error('Error approving suggestion:', updateError);
      return false;
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
