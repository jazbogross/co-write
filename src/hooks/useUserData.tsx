
import { useState } from 'react';
import { useAuthStatus } from './useAuthStatus';
import { useAuthStateHandler } from './useAuthStateHandler';

export const useUserData = () => {
  const { 
    userId: initialUserId, 
    isLoading: initialIsLoading, 
    error: initialError, 
    authProvider: initialAuthProvider, 
    authCheckedOnce: initialAuthCheckedOnce 
  } = useAuthStatus();
  
  const [userId, setUserId] = useState<string | null>(initialUserId);
  const [isLoading, setIsLoading] = useState(initialIsLoading);
  const [error, setError] = useState<string | null>(initialError);
  const [authProvider, setAuthProvider] = useState<string | null>(initialAuthProvider);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(initialAuthCheckedOnce);

  // Set up auth state change handler
  useAuthStateHandler({
    userId,
    setUserId,
    setAuthProvider,
    setIsLoading,
    setAuthCheckedOnce,
    setError
  });

  return { userId, isLoading, error, authProvider, authCheckedOnce };
};
