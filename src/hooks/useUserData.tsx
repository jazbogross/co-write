
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserData = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);

  useEffect(() => {
    console.log('👤 useUserData: Initializing...');
    let mounted = true;
    
    const fetchUser = async () => {
      try {
        console.log('👤 useUserData: Fetching user...');
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('👤 useUserData: Error fetching user:', userError);
          if (mounted) {
            setError(userError.message);
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
          }
        } else if (user) {
          console.log('👤 useUserData: User fetched:', user.id);
          // Check auth provider
          const provider = user.app_metadata?.provider || null;
          console.log('👤 useUserData: Auth provider:', provider);
          
          if (mounted) {
            setUserId(user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
        } else {
          console.log('👤 useUserData: No user found');
          if (mounted) {
            setUserId(null);
            setIsLoading(false);
            setAuthProvider(null);
            setAuthCheckedOnce(true);
            setError(null);
          }
        }
      } catch (error) {
        console.error('👤 useUserData: Error fetching user:', error);
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
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('👤 useUserData: Auth state change event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 useUserData: User signed in:', session.user.id);
        const provider = session.user.app_metadata?.provider || null;
        console.log('👤 useUserData: Auth provider on sign in:', provider);
        
        if (mounted) {
          setUserId(session.user.id);
          setAuthProvider(provider);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('👤 useUserData: User signed out');
        if (mounted) {
          setUserId(null);
          setAuthProvider(null);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        console.log(`👤 useUserData: ${event} for user:`, session?.user?.id);
        if (mounted && session?.user) {
          const provider = session.user.app_metadata?.provider || null;
          setUserId(session.user.id);
          setAuthProvider(provider); 
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      }
    });
    
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      console.log('👤 useUserData: Cleanup - unsubscribed from auth listener');
    };
  }, []);

  return { userId, isLoading, error, authProvider, authCheckedOnce };
};
