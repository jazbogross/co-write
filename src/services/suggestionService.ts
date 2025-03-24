
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';
import Delta from 'quill-delta'; // Properly import Delta

/**
 * Fetch all suggestions for a script
 */
export const fetchSuggestions = async (scriptId: string) => {
  // Fetch suggestions
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
    .from('scripts')
    .select('content')
    .eq('id', scriptId)
    .single();
  
  if (error) throw error;
  
  // Create a proper Delta object from content
  if (data?.content) {
    return safeToDelta(data.content);
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
  
  console.log('Original content:', JSON.stringify(originalContent));
  console.log('Suggestion diff:', JSON.stringify(diff));
  
  // Apply the diff to the original content
  // Create proper Delta instances to ensure compose works correctly
  const originalDelta = new Delta(originalContent.ops || []);
  const diffDeltaObj = new Delta(diff?.ops || []);
  
  // Compose the deltas to get the new content
  const newContent = originalDelta.compose(diffDeltaObj);
  console.log('New composed content:', JSON.stringify(newContent));
  
  // Convert to plain object for storage
  const newContentObj = JSON.parse(JSON.stringify(newContent));
  
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
      version_number: 1, // Start with version 1 since we don't track versions in content anymore
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
