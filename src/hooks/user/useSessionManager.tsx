
import { useEffect } from 'react';
import { useInitialSessionCheck } from './session/useInitialSessionCheck';
import { useAuthStateChangeHandler } from './session/useAuthStateChangeHandler';

export const useSessionManager = (
  state: {
    userId: string | null;
    isLoading: boolean;
    error: string | null;
    authProvider: string | null;
    authCheckedOnce: boolean;
  },
  setters: {
    setUserId: (id: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setAuthProvider: (provider: string | null) => void;
    setAuthCheckedOnce: (checked: boolean) => void;
  },
  refs: {
    isMounted: React.MutableRefObject<boolean>;
    authListenerCleanup: React.MutableRefObject<(() => void) | null>;
  }
) => {
  // Set up session checking and auth listener
  const { checkInitialSession } = useInitialSessionCheck({
    isMounted: refs.isMounted,
    setUserId: setters.setUserId,
    setAuthProvider: setters.setAuthProvider,
    setIsLoading: setters.setIsLoading,
    setError: setters.setError,
    setAuthCheckedOnce: setters.setAuthCheckedOnce,
  });
  
  const { setupAuthListener } = useAuthStateChangeHandler({
    isMounted: refs.isMounted,
    setUserId: setters.setUserId,
    setAuthProvider: setters.setAuthProvider,
    setIsLoading: setters.setIsLoading,
    setError: setters.setError,
    setAuthCheckedOnce: setters.setAuthCheckedOnce,
    authListenerCleanup: refs.authListenerCleanup,
  });

  // Check for initial session and set up auth state listener
  useEffect(() => {
    console.log('👤 useSessionManager: Initializing user data check...');
    
    // Check session immediately
    checkInitialSession();
    
    // Set up auth state change listener with better cleanup
    setupAuthListener();
    
    return () => {
      if (refs.authListenerCleanup.current) {
        console.log('👤 useSessionManager: Cleaning up auth listener on effect cleanup');
        refs.authListenerCleanup.current();
        refs.authListenerCleanup.current = null;
      }
    };
  }, []);
};
