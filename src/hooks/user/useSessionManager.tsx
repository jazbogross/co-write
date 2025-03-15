
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGitHubTokenManager } from './useGitHubTokenManager';

export const useSessionManager = (
  state: {
    userId: string | null;
    isLoading: boolean;
    error: string | null;
    authProvider: string | null;
    authCheckedOnce: boolean;
  },
  setters: {
    setUserId: (id: string | null) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    setAuthProvider: (provider: string | null) => void;
    setAuthCheckedOnce: (checked: boolean) => void;
  },
  refs: {
    isMounted: React.MutableRefObject<boolean>;
    authListenerCleanup: React.MutableRefObject<(() => void) | null>;
  }
) => {
  const { handleGitHubToken } = useGitHubTokenManager();

  // Check for initial session and set up auth state listener
  useEffect(() => {
    console.log('👤 useSessionManager: Initializing user data check...');
    
    const checkInitialSession = async () => {
      try {
        console.log('👤 useSessionManager: Checking for initial session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('👤 useSessionManager: Error getting session:', sessionError);
          if (refs.isMounted.current) {
            setters.setError(sessionError.message);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
          }
          return;
        }
        
        if (!sessionData.session) {
          console.log('👤 useSessionManager: No active session found');
          if (refs.isMounted.current) {
            setters.setUserId(null);
            setters.setAuthProvider(null);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
          }
          return;
        }
        
        // We have an active session
        const user = sessionData.session.user;
        console.log('👤 useSessionManager: Active session found, user ID:', user.id);
        
        if (refs.isMounted.current) {
          const provider = user.app_metadata?.provider || null;
          console.log('👤 useSessionManager: Auth provider:', provider);
          
          // Update the github_access_token in profile if available
          if (provider === 'github' && sessionData.session.provider_token) {
            await handleGitHubToken(user.id, user.email, sessionData.session.provider_token);
          }
          
          if (refs.isMounted.current) {
            setters.setUserId(user.id);
            setters.setAuthProvider(provider);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
            setters.setError(null);
            console.log('👤 useSessionManager: State updated with session data, userId:', user.id);
          }
        }
      } catch (error) {
        console.error('👤 useSessionManager: Exception checking session:', error);
        if (refs.isMounted.current) {
          setters.setError(error instanceof Error ? error.message : 'Unknown error');
          setters.setIsLoading(false);
          setters.setAuthCheckedOnce(true);
        }
      }
    };
    
    // Check session immediately
    checkInitialSession();
    
    // Set up auth state change listener with better cleanup
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`👤 useSessionManager: Auth state change event: ${event}`, {
          sessionExists: !!session,
          userId: session?.user?.id
        });
        
        if (!refs.isMounted.current) {
          console.log('👤 useSessionManager: Component unmounted, skipping auth state update');
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('👤 useSessionManager: User signed in:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          // Update GitHub token if available
          if (provider === 'github' && session.provider_token) {
            await handleGitHubToken(session.user.id, session.user.email, session.provider_token);
          }
          
          if (refs.isMounted.current) {
            setters.setUserId(session.user.id);
            setters.setAuthProvider(provider);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
            setters.setError(null);
            console.log('👤 useSessionManager: State updated after sign in, userId:', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👤 useSessionManager: User signed out');
          if (refs.isMounted.current) {
            setters.setUserId(null);
            setters.setAuthProvider(null);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
            setters.setError(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('👤 useSessionManager: Token refreshed for user:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          // Update GitHub token if available
          if (provider === 'github' && session.provider_token) {
            await handleGitHubToken(session.user.id, session.user.email, session.provider_token);
          }
          
          if (refs.isMounted.current) {
            setters.setUserId(session.user.id);
            setters.setAuthProvider(provider);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
            setters.setError(null);
            console.log('👤 useSessionManager: State updated after token refresh, userId:', session.user.id);
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('👤 useSessionManager: User updated:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          if (refs.isMounted.current) {
            setters.setUserId(session.user.id);
            setters.setAuthProvider(provider);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
            setters.setError(null);
            console.log('👤 useSessionManager: State updated after user update, userId:', session.user.id);
          }
        }
      });

      // Store cleanup function
      refs.authListenerCleanup.current = () => {
        console.log('👤 useSessionManager: Cleaning up auth listener via stored function');
        authListener.subscription.unsubscribe();
      };

    } catch (error) {
      console.error('👤 useSessionManager: Error setting up auth listener:', error);
      if (refs.isMounted.current) {
        setters.setError('Error setting up authentication listener');
        setters.setIsLoading(false);
        setters.setAuthCheckedOnce(true);
      }
    }
    
    return () => {
      if (refs.authListenerCleanup.current) {
        console.log('👤 useSessionManager: Cleaning up auth listener on effect cleanup');
        refs.authListenerCleanup.current();
        refs.authListenerCleanup.current = null;
      }
    };
  }, []);
};
