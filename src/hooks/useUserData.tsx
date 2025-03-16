
import { useEffect } from 'react';
import { useAuthStateManager } from './user/useAuthStateManager';
import { useSessionManager } from './user/useSessionManager';
import { useAuthCleanup } from './user/lifecycle/useAuthCleanup';
import { useAuthStateTracking } from './user/lifecycle/useAuthStateTracking';

/**
 * Hook for managing user data and authentication state
 * @returns Object containing user authentication data and status
 */
export const useUserData = () => {
  console.log("👤 useUserData: Initializing user data check...");
  
  // Get state management from our auth state manager
  const { state, setters, refs } = useAuthStateManager();
  
  // Set up session management and auth listener
  useSessionManager(state, setters, refs);
  
  // Set up hooks for cleanup and state tracking
  useAuthCleanup(refs.isMounted, refs.authListenerCleanup);
  useAuthStateTracking(state);

  return { 
    userId: state.userId, 
    isLoading: state.isLoading, 
    error: state.error, 
    authProvider: state.authProvider, 
    authCheckedOnce: state.authCheckedOnce 
  };
};
