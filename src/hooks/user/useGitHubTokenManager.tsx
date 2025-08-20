
import { storeGitHubToken } from '@/services/githubProfileService';

export const useGitHubTokenManager = () => {
  const handleGitHubToken = async (
    userId: string, 
    email: string | undefined, 
    githubToken: string
  ) => {
    console.log('👤 useGitHubTokenManager: Handling GitHub token for user:', userId);
    
    try {
      const { success, error } = await storeGitHubToken(userId, email, githubToken);
      
      if (!success) {
        console.error('👤 useGitHubTokenManager: Error storing GitHub token:', error);
        return false;
      }
      
      console.log('👤 useGitHubTokenManager: GitHub token stored successfully');
      return true;
    } catch (error) {
      console.error('👤 useGitHubTokenManager: Exception handling GitHub token:', error);
      return false;
    }
  };
  
  return { handleGitHubToken };
};
