
import { supabase } from '@/integrations/supabase/client';
import { useGitHubTokenManager } from '../useGitHubTokenManager';

interface AuthStateChangeParams {
  isMounted: React.MutableRefObject<boolean>;
  setUserId: (id: string | null) => void;
  setAuthProvider: (provider: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthCheckedOnce: (checked: boolean) => void;
  authListenerCleanup: React.MutableRefObject<(() => void) | null>;
}

export const useAuthStateChangeHandler = ({
  isMounted,
  setUserId,
  setAuthProvider,
  setIsLoading,
  setError,
  setAuthCheckedOnce,
  authListenerCleanup,
}: AuthStateChangeParams) => {
  const { handleGitHubToken } = useGitHubTokenManager();
  
  const setupAuthListener = () => {
    try {
      console.log('👤 useAuthStateChangeHandler: Setting up Supabase auth state change listener');
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`👤 useAuthStateChangeHandler: Auth state change event: ${event}`, {
          sessionExists: !!session,
          userId: session?.user?.id
        });
        
        if (!isMounted.current) {
          console.log('👤 useAuthStateChangeHandler: Component unmounted, skipping auth state update');
          return;
        }
        
        // Always set authCheckedOnce to true for any non-initial auth event
        if (isMounted.current && !event.includes('INITIAL')) {
          setAuthCheckedOnce(true);
          console.log(`👤 useAuthStateChangeHandler: Auth checked explicitly set to true for event: ${event}`);
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('👤 useAuthStateChangeHandler: User signed in:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          // Update GitHub token if available
          if (provider === 'github' && session.provider_token) {
            await handleGitHubToken(session.user.id, session.user.email, session.provider_token);
          }
          
          if (isMounted.current) {
            setUserId(session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setError(null);
            console.log('👤 useAuthStateChangeHandler: State updated after sign in, userId:', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👤 useAuthStateChangeHandler: User signed out');
          if (isMounted.current) {
            setUserId(null);
            setAuthProvider(null);
            setIsLoading(false);
            setError(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('👤 useAuthStateChangeHandler: Token refreshed for user:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          // Update GitHub token if available
          if (provider === 'github' && session.provider_token) {
            await handleGitHubToken(session.user.id, session.user.email, session.provider_token);
          }
          
          if (isMounted.current) {
            setUserId(session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setError(null);
            console.log('👤 useAuthStateChangeHandler: State updated after token refresh, userId:', session.user.id);
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('👤 useAuthStateChangeHandler: User updated:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          if (isMounted.current) {
            setUserId(session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setError(null);
            console.log('👤 useAuthStateChangeHandler: State updated after user update, userId:', session.user.id);
          }
        }
      });

      // Store cleanup function
      authListenerCleanup.current = () => {
        console.log('👤 useAuthStateChangeHandler: Cleaning up auth listener via stored function');
        authListener.subscription.unsubscribe();
      };

      return true;
    } catch (error) {
      console.error('👤 useAuthStateChangeHandler: Error setting up auth listener:', error);
      if (isMounted.current) {
        setError('Error setting up authentication listener');
        setIsLoading(false);
        setAuthCheckedOnce(true);
        console.log('👤 useAuthStateChangeHandler: Auth checked set to true after listener setup error');
      }
      return false;
    }
  };
  
  return { setupAuthListener };
};
