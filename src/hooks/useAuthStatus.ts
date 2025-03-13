
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthStatus = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);
  const mountCountRef = useRef(0);

  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`🔒 useAuthStatus: Initializing auth status check... (mount #${mountCountRef.current})`);
    let mounted = true;
    
    const fetchUser = async () => {
      try {
        console.log('🔒 useAuthStatus: Fetching current user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('🔒 useAuthStatus: Error fetching user:', userError);
          if (mounted) {
            setError(userError.message);
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
            console.log('🔒 useAuthStatus: Set state after error - no user, not loading, authCheckedOnce=true');
          }
        } else if (user) {
          console.log('🔒 useAuthStatus: User fetched:', user.id);
          const provider = user.app_metadata?.provider || null;
          console.log('🔒 useAuthStatus: Auth provider:', provider);
          
          if (mounted) {
            setUserId(user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
            console.log('🔒 useAuthStatus: Set state after success - userId, authProvider, not loading, authCheckedOnce=true');
          }
        } else {
          console.log('🔒 useAuthStatus: No user found');
          if (mounted) {
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
            setError(null);
            console.log('🔒 useAuthStatus: Set state after no user - no userId, not loading, authCheckedOnce=true');
          }
        }
      } catch (error) {
        console.error('🔒 useAuthStatus: Exception fetching user:', error);
        if (mounted) {
          setError(error instanceof Error ? error.message : 'Unknown error');
          setUserId(null);
          setIsLoading(false);
          setAuthProvider(null);
          setAuthCheckedOnce(true);
          console.log('🔒 useAuthStatus: Set state after exception - no userId, not loading, authCheckedOnce=true');
        }
      }
    };
    
    fetchUser();
    
    return () => {
      mounted = false;
      console.log(`🔒 useAuthStatus: Cleanup - unmounted (mount #${mountCountRef.current})`);
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log('🔒 useAuthStatus: State updated:', { 
      userId, 
      isLoading, 
      authProvider, 
      authCheckedOnce,
      hasError: !!error 
    });
  }, [userId, isLoading, error, authProvider, authCheckedOnce]);

  return { userId, isLoading, error, authProvider, authCheckedOnce };
};
