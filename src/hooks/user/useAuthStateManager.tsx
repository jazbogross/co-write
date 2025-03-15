
import { useState, useRef } from 'react';

export const useAuthStateManager = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);
  const isMounted = useRef(true);
  const authListenerCleanup = useRef<(() => void) | null>(null);

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
