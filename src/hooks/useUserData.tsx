
import { useSession } from '@supabase/auth-helpers-react';

/**
 * Hook for accessing user data by leveraging Supabase's session context
 * @returns Object containing user authentication data and status
 */
export const useUserData = () => {
  console.log("👤 useUserData: Using session context from auth-helpers-react");
  
  // Use the session context
  const session = useSession();
  
  // Get user id from the session
  const userId = session?.user?.id || null;
  
  // Determine auth provider from user metadata if available
  const authProvider = session?.user?.app_metadata?.provider || null;
  
  // Format the return value to match existing interface
  return { 
    userId, 
    isLoading: false,
    error: null, 
    authProvider, 
    authCheckedOnce: true
  };
};
