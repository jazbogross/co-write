
import { useState, useEffect, useRef } from 'react';
import { useAuthStatus } from './useAuthStatus';
import { useAuthStateHandler } from './useAuthStateHandler';

export const useUserData = () => {
  console.log('👤 useUserData: Initializing...');
  const mountCountRef = useRef(0);
  
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

  // Log initial values from useAuthStatus
  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`👤 useUserData: Component mounted (mount #${mountCountRef.current})`);
    console.log('👤 useUserData: Initial values from useAuthStatus:', {
      initialUserId,
      initialIsLoading,
      initialAuthProvider,
      initialAuthCheckedOnce,
      hasInitialError: !!initialError
    });
    
    return () => {
      console.log(`👤 useUserData: Component unmounted (mount #${mountCountRef.current})`);
    };
  }, [initialUserId, initialIsLoading, initialError, initialAuthProvider, initialAuthCheckedOnce]);

  // Log when state changes
  useEffect(() => {
    console.log('👤 useUserData: State updated:', {
      userId,
      isLoading,
      authProvider,
      authCheckedOnce,
      hasError: !!error
    });
  }, [userId, isLoading, error, authProvider, authCheckedOnce]);

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
