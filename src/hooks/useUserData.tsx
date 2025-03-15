
import { useEffect } from 'react';
import { useAuthStateManager } from './user/useAuthStateManager';
import { useSessionManager } from './user/useSessionManager';

export const useUserData = () => {
  console.log("👤 useUserData: Initializing user data check...");
  
  // Get state management from our auth state manager
  const { state, setters, refs } = useAuthStateManager();
  
  // Set up session management and auth listener
  useSessionManager(state, setters, refs);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("👤 useUserData: Component unmounting, cleaning up");
      refs.isMounted.current = false;
      
      // Clean up auth listener if it exists
      if (refs.authListenerCleanup.current) {
        console.log("👤 useUserData: Cleaning up auth listener on unmount");
        refs.authListenerCleanup.current();
        refs.authListenerCleanup.current = null;
      }
    };
  }, []);

  // Log state updates
  useEffect(() => {
    console.log('👤 useUserData: State updated:', {
      userId: state.userId,
      isLoading: state.isLoading,
      error: state.error,
      authProvider: state.authProvider,
      authCheckedOnce: state.authCheckedOnce
    });
  }, [state.userId, state.isLoading, state.error, state.authProvider, state.authCheckedOnce]);

  return { 
    userId: state.userId, 
    isLoading: state.isLoading, 
    error: state.error, 
    authProvider: state.authProvider, 
    authCheckedOnce: state.authCheckedOnce 
  };
};
