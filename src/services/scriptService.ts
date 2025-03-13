
import { supabase } from '@/integrations/supabase/client';
import { ScriptContent, ScriptDraft, ScriptSuggestion, ScriptVersion } from '@/types/lineTypes';
import { DeltaStatic } from 'quill';

/**
 * Fetches the full script content as a Delta object
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
    
    if (!data) {
      console.log('No content found for script:', scriptId);
      return null;
    }
    
    return {
      scriptId,
      contentDelta: data.content_delta,
      version: data.version
    };
  } catch (error) {
    console.error('Error in fetchScriptContent:', error);
    return null;
  }
};

/**
 * Saves the full script content
 */
export const saveScriptContent = async (
  scriptId: string, 
  contentDelta: DeltaStatic,
  createVersion: boolean = true
): Promise<boolean> => {
  try {
    // Begin transaction
    const { data: existingData, error: fetchError } = await supabase
      .from('script_content')
      .select('version')
      .eq('script_id', scriptId)
      .single();
      
    if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error fetching existing script version:', fetchError);
      return false;
    }
    
    const currentVersion = existingData?.version || 0;
    const newVersion = currentVersion + 1;
    
    // Create or update script content
    const { error: updateError } = await supabase
      .from('script_content')
      .upsert({
        script_id: scriptId,
        content_delta: contentDelta,
        version: newVersion,
        updated_at: new Date()
      });
      
    if (updateError) {
      console.error('Error saving script content:', updateError);
      return false;
    }
    
    // Create a new version entry if requested
    if (createVersion) {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      
      const { error: versionError } = await supabase
        .from('script_versions')
        .insert({
          script_id: scriptId,
          version_number: newVersion,
          content_delta: contentDelta,
          created_by: userId
        });
        
      if (versionError) {
        console.error('Error creating version entry:', versionError);
        // Continue anyway, since main content was saved successfully
      }
    }
    
    console.log(`Script content saved successfully with version ${newVersion}`);
    return true;
  } catch (error) {
    console.error('Error in saveScriptContent:', error);
    return false;
  }
};

/**
 * Saves a draft for the current user
 */
export const saveDraft = async (
  scriptId: string,
  draftContent: DeltaStatic
): Promise<boolean> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) {
      console.error('Cannot save draft: User not authenticated');
      return false;
    }
    
    const { error } = await supabase
      .from('script_drafts')
      .upsert({
        script_id: scriptId,
        user_id: userId,
        draft_content: draftContent,
        updated_at: new Date()
      });
      
    if (error) {
      console.error('Error saving draft:', error);
      return false;
    }
    
    console.log('Draft saved successfully');
    return true;
  } catch (error) {
    console.error('Error in saveDraft:', error);
    return false;
  }
};

/**
 * Loads a draft for the current user
 */
export const loadDraft = async (scriptId: string): Promise<ScriptDraft | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) {
      console.error('Cannot load draft: User not authenticated');
      return null;
    }
    
    const { data, error } = await supabase
      .from('script_drafts')
      .select('id, draft_content, updated_at')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        console.log('No draft found for this user and script');
        return null;
      }
      
      console.error('Error loading draft:', error);
      return null;
    }
    
    if (!data) {
      return null;
    }
    
    return {
      id: data.id,
      scriptId,
      userId,
      draftContent: data.draft_content,
      updatedAt: new Date(data.updated_at)
    };
  } catch (error) {
    console.error('Error in loadDraft:', error);
    return null;
  }
};

/**
 * Creates a suggestion based on the difference between original and suggested content
 */
export const createSuggestion = async (
  scriptId: string,
  originalDelta: DeltaStatic,
  suggestedDelta: DeltaStatic
): Promise<string | null> => {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    
    if (!userId) {
      console.error('Cannot create suggestion: User not authenticated');
      return null;
    }
    
    // Calculate the difference delta
    // Note: In a real implementation, you would use Delta.diff() from Quill
    // For now, we just store the entire suggested delta
    const deltaDiff = suggestedDelta;
    
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: deltaDiff,
        status: 'pending'
      })
      .select('id');
      
    if (error) {
      console.error('Error creating suggestion:', error);
      return null;
    }
    
    console.log('Suggestion created successfully:', data[0].id);
    return data[0].id;
  } catch (error) {
    console.error('Error in createSuggestion:', error);
    return null;
  }
};

/**
 * Fetches suggestions for a script
 */
export const fetchSuggestions = async (scriptId: string): Promise<ScriptSuggestion[]> => {
  try {
    const { data, error } = await supabase
      .from('script_suggestions')
      .select('*')
      .eq('script_id', scriptId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching suggestions:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      scriptId: item.script_id,
      userId: item.user_id,
      deltaDiff: item.delta_diff,
      status: item.status,
      rejectionReason: item.rejection_reason,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at)
    }));
  } catch (error) {
    console.error('Error in fetchSuggestions:', error);
    return [];
  }
};

/**
 * Approve a suggestion and apply it to the script content
 */
export const approveSuggestion = async (suggestionId: string): Promise<boolean> => {
  try {
    // Fetch the suggestion
    const { data: suggestion, error: suggestionError } = await supabase
      .from('script_suggestions')
      .select('delta_diff, script_id, status')
      .eq('id', suggestionId)
      .single();
      
    if (suggestionError || !suggestion) {
      console.error('Error fetching suggestion:', suggestionError);
      return false;
    }
    
    if (suggestion.status !== 'pending') {
      console.error('Cannot approve suggestion: Status is not pending');
      return false;
    }
    
    // Fetch current script content
    const { data: scriptContent, error: contentError } = await supabase
      .from('script_content')
      .select('content_delta, version')
      .eq('script_id', suggestion.script_id)
      .single();
      
    if (contentError || !scriptContent) {
      console.error('Error fetching script content:', contentError);
      return false;
    }
    
    // Apply the suggestion - in a real implementation we would use Delta.compose()
    // from Quill to apply the diff. For now, we just replace with the suggestion.
    const updatedDelta = suggestion.delta_diff;
    
    // Save the updated content
    const saveResult = await saveScriptContent(
      suggestion.script_id,
      updatedDelta,
      true // create version
    );
    
    if (!saveResult) {
      console.error('Failed to save updated content');
      return false;
    }
    
    // Update suggestion status
    const { error: updateError } = await supabase
      .from('script_suggestions')
      .update({ status: 'approved', updated_at: new Date() })
      .eq('id', suggestionId);
      
    if (updateError) {
      console.error('Error updating suggestion status:', updateError);
      // Proceed anyway since content was updated successfully
    }
    
    console.log('Suggestion approved and applied successfully');
    return true;
  } catch (error) {
    console.error('Error in approveSuggestion:', error);
    return false;
  }
};

/**
 * Reject a suggestion
 */
export const rejectSuggestion = async (
  suggestionId: string, 
  reason?: string
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('script_suggestions')
      .update({ 
        status: 'rejected',
        rejection_reason: reason || 'No reason provided',
        updated_at: new Date()
      })
      .eq('id', suggestionId);
      
    if (error) {
      console.error('Error rejecting suggestion:', error);
      return false;
    }
    
    console.log('Suggestion rejected successfully');
    return true;
  } catch (error) {
    console.error('Error in rejectSuggestion:', error);
    return false;
  }
};

/**
 * Fetch version history for a script
 */
export const fetchVersionHistory = async (scriptId: string): Promise<ScriptVersion[]> => {
  try {
    const { data, error } = await supabase
      .from('script_versions')
      .select('*')
      .eq('script_id', scriptId)
      .order('version_number', { ascending: false });
      
    if (error) {
      console.error('Error fetching version history:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      scriptId: item.script_id,
      versionNumber: item.version_number,
      contentDelta: item.content_delta,
      createdBy: item.created_by,
      createdAt: new Date(item.created_at)
    }));
  } catch (error) {
    console.error('Error in fetchVersionHistory:', error);
    return [];
  }
};

/**
 * Restore a specific version of the script
 */
export const restoreVersion = async (
  scriptId: string,
  versionId: string
): Promise<boolean> => {
  try {
    // Fetch the version to restore
    const { data: version, error: versionError } = await supabase
      .from('script_versions')
      .select('content_delta')
      .eq('id', versionId)
      .eq('script_id', scriptId)
      .single();
      
    if (versionError || !version) {
      console.error('Error fetching version:', versionError);
      return false;
    }
    
    // Save as the new current version
    const saveResult = await saveScriptContent(
      scriptId,
      version.content_delta,
      true // create a new version entry
    );
    
    if (!saveResult) {
      console.error('Failed to restore version');
      return false;
    }
    
    console.log('Version restored successfully');
    return true;
  } catch (error) {
    console.error('Error in restoreVersion:', error);
    return false;
  }
};
