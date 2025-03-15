
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStateHandler } from './useAuthStateHandler';

export const useUserData = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);

  // Check for initial session on mount
  useEffect(() => {
    console.log('👤 useUserData: Initializing user data check...');
    let mounted = true;
    
    const checkInitialSession = async () => {
      try {
        console.log('👤 useUserData: Checking for initial session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('👤 useUserData: Error getting session:', sessionError);
          if (mounted) {
            setError(sessionError.message);
            setIsLoading(false);
            setAuthCheckedOnce(true);
          }
          return;
        }
        
        if (!sessionData.session) {
          console.log('👤 useUserData: No active session found');
          if (mounted) {
            setUserId(null);
            setAuthProvider(null);
            setIsLoading(false);
            setAuthCheckedOnce(true);
          }
          return;
        }
        
        // We have an active session
        const user = sessionData.session.user;
        console.log('👤 useUserData: Active session found, user ID:', user.id);
        
        if (mounted) {
          const provider = user.app_metadata?.provider || null;
          setUserId(user.id);
          setAuthProvider(provider);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } catch (error) {
        console.error('👤 useUserData: Exception checking session:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Unknown error');
          setIsLoading(false);
          setAuthCheckedOnce(true);
        }
      }
    };
    
    checkInitialSession();
    
    return () => {
      mounted = false;
    };
  }, []);

  // Set up auth state change handler
  useAuthStateHandler({
    userId,
    setUserId,
    setAuthProvider,
    setIsLoading,
    setAuthCheckedOnce,
    setError
  });

  useEffect(() => {
    console.log('👤 useUserData: State updated:', {
      userId,
      isLoading,
      error,
      authProvider,
      authCheckedOnce
    });
  }, [userId, isLoading, error, authProvider, authCheckedOnce]);

  return { userId, isLoading, error, authProvider, authCheckedOnce };
};
