
import { supabase } from '@/integrations/supabase/client';
import { storeGitHubToken } from '@/services/githubProfileService';

export const useGitHubTokenManager = () => {
  const handleGitHubToken = async (userId: string, email: string | undefined, providerToken: string) => {
    console.log('👤 useGitHubTokenManager: Storing GitHub token for user');
    try {
      await storeGitHubToken(userId, email, providerToken);
      console.log('👤 useGitHubTokenManager: GitHub token stored successfully');
      return true;
    } catch (tokenError) {
      console.error('👤 useGitHubTokenManager: Error storing GitHub token:', tokenError);
      // Continue anyway - this shouldn't block the auth flow
      return false;
    }
  };

  return { handleGitHubToken };
};
