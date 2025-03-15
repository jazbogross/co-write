
import { useEffect } from 'react';
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
  useEffect(() => {
    console.log('🔄 useAuthStateHandler: Setting up auth state change listener');
    let mounted = true;
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔄 useAuthStateHandler: Auth state change event: ${event}`, {
        sessionExists: !!session,
        userId: session?.user?.id
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
          await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
        }
        
        if (mounted) {
          setUserId(session.user.id);
          setAuthProvider(provider);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 useAuthStateHandler: User signed out');
        if (mounted) {
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
          
          // Update the github_access_token in profile if available
          if (provider === 'github' && session.provider_token) {
            console.log('🔄 useAuthStateHandler: GitHub provider token available on token refresh, updating profile');
            await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
          }
          
          if (mounted) {
            setUserId(session.user.id);
            setAuthProvider(provider); 
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
        }
      }
    });
    
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      console.log('🔄 useAuthStateHandler: Cleanup - unsubscribed from auth listener');
    };
  }, [setUserId, setAuthProvider, setIsLoading, setAuthCheckedOnce, setError]);
};
