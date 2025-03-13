
import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storeGitHubToken } from '@/services/githubProfileService';

interface UseAuthStateHandlerProps {
  userId: string | null;
  setUserId: (id: string | null) => void;
  setAuthProvider: (provider: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setAuthCheckedOnce: (checked: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStateHandler = ({
  userId,
  setUserId,
  setAuthProvider,
  setIsLoading,
  setAuthCheckedOnce,
  setError
}: UseAuthStateHandlerProps) => {
  const mountCountRef = useRef(0);
  const sessionEventCountRef = useRef({
    SIGNED_IN: 0,
    SIGNED_OUT: 0,
    TOKEN_REFRESHED: 0,
    INITIAL_SESSION: 0
  });

  useEffect(() => {
    mountCountRef.current += 1;
    console.log(`🔄 useAuthStateHandler: Setting up auth state change listener (mount #${mountCountRef.current})`);
    console.log(`🔄 useAuthStateHandler: Initial state - userId: ${userId || 'null'}`);
    
    let mounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Count events to detect potential loops
      if (sessionEventCountRef.current[event as keyof typeof sessionEventCountRef.current] !== undefined) {
        sessionEventCountRef.current[event as keyof typeof sessionEventCountRef.current]++;
      }
      
      console.log(`🔄 useAuthStateHandler: Auth state change event: ${event}`, {
        sessionExists: !!session,
        userId: session?.user?.id,
        eventCount: sessionEventCountRef.current[event as keyof typeof sessionEventCountRef.current] || 0
      });
      
      if (!mounted) {
        console.log('🔄 useAuthStateHandler: Component unmounted, skipping auth state change handling');
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔄 useAuthStateHandler: User signed in:', session.user.id);
        const provider = session.user.app_metadata?.provider || null;
        console.log('🔄 useAuthStateHandler: Auth provider on sign in:', provider);
        
        // Update the github_access_token in profile if available
        if (provider === 'github' && session.provider_token) {
          console.log('🔄 useAuthStateHandler: GitHub provider token available, updating profile');
          try {
            const result = await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
            console.log('🔄 useAuthStateHandler: GitHub token store result:', result);
          } catch (err) {
            console.error('🔄 useAuthStateHandler: Error storing GitHub token:', err);
          }
        }
        
        if (mounted) {
          console.log('🔄 useAuthStateHandler: Setting state after sign in');
          setUserId(session.user.id);
          setAuthProvider(provider);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 useAuthStateHandler: User signed out');
        if (mounted) {
          console.log('🔄 useAuthStateHandler: Setting state after sign out');
          setUserId(null);
          setAuthProvider(null);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
        console.log(`🔄 useAuthStateHandler: ${event} event for user:`, session?.user?.id);
        if (mounted && session?.user) {
          const provider = session.user.app_metadata?.provider || null;
          console.log('🔄 useAuthStateHandler: Auth provider on session/refresh:', provider);
          
          // Update the github_access_token in profile if available
          if (provider === 'github' && session.provider_token) {
            console.log('🔄 useAuthStateHandler: GitHub provider token available on token refresh, updating profile');
            try {
              const result = await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
              console.log('🔄 useAuthStateHandler: GitHub token store result on refresh:', result);
            } catch (err) {
              console.error('🔄 useAuthStateHandler: Error storing GitHub token on refresh:', err);
            }
          }
          
          if (mounted) {
            console.log('🔄 useAuthStateHandler: Setting state after token refresh/initial session');
            setUserId(session.user.id);
            setAuthProvider(provider); 
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
        } else if (mounted && !session?.user && event === 'INITIAL_SESSION') {
          console.log('🔄 useAuthStateHandler: INITIAL_SESSION with no user, setting state accordingly');
          setUserId(null);
          setAuthProvider(null);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      }
    });
    
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      console.log(`🔄 useAuthStateHandler: Cleanup - unsubscribed from auth listener (mount #${mountCountRef.current})`);
      console.log('🔄 useAuthStateHandler: Final event counts:', sessionEventCountRef.current);
    };
  }, [setUserId, setAuthProvider, setIsLoading, setAuthCheckedOnce, setError]);
};
