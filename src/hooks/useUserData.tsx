
import { useAuth } from './useAuth';

/**
 * Hook for accessing user data by leveraging the main auth system
 * @returns Object containing user authentication data and status
 */
export const useUserData = () => {
  console.log("👤 useUserData: Using centralized auth system");
  
  // Use the main auth system instead of separate state
  const { user, loading: isLoading, authChecked: authCheckedOnce } = useAuth();
  
  // Determine auth provider from user metadata if available
  const authProvider = user?.provider || null;
  
  // Format the return value to match existing interface
  return { 
    userId: user?.id || null, 
    isLoading,
    error: null, 
    authProvider, 
    authCheckedOnce
  };
};
