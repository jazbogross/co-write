
import { supabase } from "@/integrations/supabase/client";

/**
 * Checks if a profile exists for the specified user
 */
export const checkProfileExists = async (userId: string) => {
  console.log('🧩 GitHubProfileService: Checking if profile exists for user:', userId);
  
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
      
    if (error) {
      console.error('🧩 GitHubProfileService: Error checking profile existence:', error);
      return { exists: false, error };
    }
    
    console.log('🧩 GitHubProfileService: Profile exists check result:', !!data);
    return { exists: !!data, error: null };
  } catch (error) {
    console.error('🧩 GitHubProfileService: Exception checking profile existence:', error);
    return { exists: false, error };
  }
};

/**
 * Creates a new profile with GitHub token
 */
export const createProfileWithGitHubToken = async (
  userId: string, 
  username: string | undefined, 
  githubToken: string
) => {
  console.log('🧩 GitHubProfileService: Creating new profile with GitHub token for user:', userId);
  
  try {
    const { error } = await supabase
      .from('profiles')
      .insert({ 
        id: userId,
        username: username?.split('@')[0] || 'user',
        github_access_token: githubToken,
        updated_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('🧩 GitHubProfileService: Error creating profile:', error);
      console.log('🧩 GitHubProfileService: Insert error details:', JSON.stringify(error));
      return { success: false, error };
    }
    
    console.log('🧩 GitHubProfileService: New profile created successfully with GitHub token');
    return { success: true, error: null };
  } catch (error) {
    console.error('🧩 GitHubProfileService: Exception creating profile:', error);
    return { success: false, error };
  }
};

/**
 * Updates an existing profile with a GitHub token
 */
export const updateProfileGitHubToken = async (userId: string, githubToken: string) => {
  console.log('🧩 GitHubProfileService: Updating GitHub token for user:', userId);
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        github_access_token: githubToken,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
      
    if (error) {
      console.error('🧩 GitHubProfileService: Error updating GitHub token:', error);
      console.log('🧩 GitHubProfileService: Update error details:', JSON.stringify(error));
      return { success: false, error };
    }
    
    console.log('🧩 GitHubProfileService: GitHub token updated successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error('🧩 GitHubProfileService: Exception updating GitHub token:', error);
    return { success: false, error };
  }
};

/**
 * Handles GitHub token storage for a user
 */
export const storeGitHubToken = async (
  userId: string, 
  email: string | undefined,
  githubToken: string
) => {
  console.log('🧩 GitHubProfileService: Storing GitHub token for user:', userId);
  
  // First check if profile exists
  const { exists, error: checkError } = await checkProfileExists(userId);
  
  if (checkError) {
    console.error('🧩 GitHubProfileService: Error checking profile before token storage:', checkError);
    return { success: false, error: checkError };
  }
  
  if (!exists) {
    console.log('🧩 GitHubProfileService: No profile found, creating one with GitHub token');
    return createProfileWithGitHubToken(userId, email, githubToken);
  } else {
    console.log('🧩 GitHubProfileService: Existing profile found, updating GitHub token');
    return updateProfileGitHubToken(userId, githubToken);
  }
};
