
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAuthStatus = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);

  useEffect(() => {
    console.log('🔒 useAuthStatus: Initializing auth status check...');
    let mounted = true;
    
    const fetchUser = async () => {
      try {
        console.log('🔒 useAuthStatus: Checking for active session...');
        
        // First check if there's an active session
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('🔒 useAuthStatus: Error fetching session:', sessionError);
          if (mounted) {
            setError(sessionError.message);
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
          }
          return;
        }
        
        // If we have a session, get the user details
        if (sessionData.session) {
          console.log('🔒 useAuthStatus: Active session found, user ID:', sessionData.session.user.id);
          
          if (mounted) {
            const provider = sessionData.session.user.app_metadata?.provider || null;
            console.log('🔒 useAuthStatus: Auth provider from session:', provider);
            
            setUserId(sessionData.session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
          
          return;
        }
        
        // If no session, fallback to getUser
        console.log('🔒 useAuthStatus: No active session, fetching user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('🔒 useAuthStatus: Error fetching user:', userError);
          if (mounted) {
            setError(userError.message);
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
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
          }
        } else {
          console.log('🔒 useAuthStatus: No user found');
          if (mounted) {
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
            setError(null);
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
        }
      }
    };
    
    fetchUser();
    
    return () => {
      mounted = false;
      console.log('🔒 useAuthStatus: Cleanup - unmounted');
    };
  }, []);

  return { userId, isLoading, error, authProvider, authCheckedOnce };
};
