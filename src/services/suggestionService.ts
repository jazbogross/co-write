
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';
import Delta from 'quill-delta';

/**
 * Fetch all suggestions for a script
 */
export const fetchSuggestions = async (scriptId: string) => {
  // Fetch suggestions without joining with profiles
  const { data, error } = await supabase
    .from('script_suggestions')
    .select(`
      id,
      delta_diff,
      status,
      rejection_reason,
      script_id,
      user_id,
      created_at,
      updated_at
    `)
    .eq('script_id', scriptId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetch user profiles for a set of user IDs
 */
export const fetchUserProfiles = async (userIds: string[]) => {
  if (userIds.length === 0) return {};
  
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds);
    
  if (error) throw error;
  
  // Create a mapping of user IDs to usernames
  const usernameMap: Record<string, string> = {};
  if (data) {
    data.forEach(profile => {
      usernameMap[profile.id] = profile.username || 'Unknown user';
    });
  }
  
  return usernameMap;
};

/**
 * Fetch original content for a script
 */
export const fetchOriginalContent = async (scriptId: string): Promise<DeltaStatic> => {
  const { data, error } = await supabase
    .from('script_content')
    .select('content_delta')
    .eq('script_id', scriptId)
    .single();
  
  if (error) throw error;
  
  // Create a proper Delta object from content
  if (data?.content_delta) {
    return safeToDelta(data.content_delta);
  }
  
  // Default to empty content with newline
  return safeToDelta({ ops: [{ insert: '\n' }] });
};

/**
 * Approve a suggestion
 */
export const approveSuggestion = async (
  scriptId: string,
  suggestionId: string,
  originalContent: DeltaStatic,
  diffDelta?: DeltaStatic
) => {
  // If diffDelta is not provided, fetch it
  let diff = diffDelta;
  if (!diff) {
    const { data, error } = await supabase
      .from('script_suggestions')
      .select('delta_diff')
      .eq('id', suggestionId)
      .single();
      
    if (error) throw error;
    diff = safeToDelta(data.delta_diff);
  }
  
  // Apply the diff to the original content
  const newContent = originalContent.compose(diff!);
  
  // Update the script_content with the new content
  const { error: updateError } = await supabase
    .from('script_content')
    .update({ 
      content_delta: JSON.parse(JSON.stringify(newContent))
    })
    .eq('script_id', scriptId);

  if (updateError) throw updateError;

  // Get current version
  const { data: versionData } = await supabase
    .from('script_content')
    .select('version')
    .eq('script_id', scriptId)
    .single();
  
  const newVersion = (versionData?.version || 0) + 1;
  
  // Update version number
  await supabase
    .from('script_content')
    .update({ version: newVersion })
    .eq('script_id', scriptId);
  
  // Save version history
  await supabase
    .from('script_versions')
    .insert({
      script_id: scriptId,
      version_number: newVersion,
      content_delta: JSON.parse(JSON.stringify(newContent)),
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
};

/**
 * Reject a suggestion
 */
export const rejectSuggestion = async (
  suggestionId: string,
  reason: string
) => {
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
};
