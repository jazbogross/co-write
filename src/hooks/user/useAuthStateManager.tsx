
import { useState, useRef } from 'react';

/**
 * Hook for managing authentication state
 * @returns Object containing auth state, setters, and refs
 */
export const useAuthStateManager = () => {
  // State management
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);
  
  // References for cleanup and tracking component mount status
  const isMounted = useRef(true);
  const authListenerCleanup = useRef<(() => void) | null>(null);

  console.log("👤 useAuthStateManager: Current state:", {
    userId,
    isLoading,
    error,
    authProvider,
    authCheckedOnce
  });

  return {
    state: {
      userId,
      isLoading,
      error,
      authProvider,
      authCheckedOnce
    },
    setters: {
      setUserId,
      setIsLoading,
      setError,
      setAuthProvider,
      setAuthCheckedOnce
    },
    refs: {
      isMounted,
      authListenerCleanup
    }
  };
};
