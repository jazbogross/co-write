
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGitHubTokenManager } from './useGitHubTokenManager';
import { toast } from 'sonner';

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
    let isInitializationComplete = false;
    
    const checkInitialSession = async () => {
      try {
        console.log('👤 useSessionManager: Checking for initial session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('👤 useSessionManager: Session check result:', { 
          hasSession: !!sessionData?.session, 
          hasError: !!sessionError 
        });
        
        if (sessionError) {
          console.error('👤 useSessionManager: Error getting session:', sessionError);
          if (refs.isMounted.current) {
            setters.setError(sessionError.message);
            setters.setIsLoading(false);
            setters.setAuthCheckedOnce(true);
            isInitializationComplete = true;
            console.log('👤 useSessionManager: Auth checked set to true after session error');
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
            isInitializationComplete = true;
            console.log('👤 useSessionManager: Auth checked set to true after no session found');
          }
          return;
        }
        
        // We have an active session
        const user = sessionData.session.user;
        console.log('👤 useSessionManager: Active session found, user ID:', user.id);
        
        // Check if the session is about to expire (within 5 minutes)
        const expiresAt = sessionData.session.expires_at;
        const nowInSeconds = Math.floor(Date.now() / 1000);
        const fiveMinutesInSeconds = 5 * 60;
        
        // If token is about to expire, refresh it
        if (expiresAt && expiresAt - nowInSeconds < fiveMinutesInSeconds) {
          console.log('👤 useSessionManager: Token is about to expire, refreshing...');
          
          try {
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.error('👤 useSessionManager: Failed to refresh token:', refreshError);
              // If refresh fails, sign the user out and redirect to login
              if (refs.isMounted.current) {
                setters.setUserId(null);
                setters.setAuthProvider(null);
                setters.setIsLoading(false);
                setters.setAuthCheckedOnce(true);
                isInitializationComplete = true;
                toast.error("Your session has expired. Please sign in again.");
              }
              return;
            }
            
            if (!refreshData.session) {
              console.log('👤 useSessionManager: No session returned after refresh');
              if (refs.isMounted.current) {
                setters.setUserId(null);
                setters.setAuthProvider(null);
                setters.setIsLoading(false);
                setters.setAuthCheckedOnce(true);
                isInitializationComplete = true;
                toast.error("Your session has expired. Please sign in again.");
              }
              return;
            }
            
            console.log('👤 useSessionManager: Token refreshed successfully');
            // Update session data with the refreshed session
            sessionData.session = refreshData.session;
            user = refreshData.session.user;
          } catch (refreshException) {
            console.error('👤 useSessionManager: Exception during token refresh:', refreshException);
            if (refs.isMounted.current) {
              setters.setUserId(null);
              setters.setAuthProvider(null);
              setters.setIsLoading(false);
              setters.setAuthCheckedOnce(true);
              isInitializationComplete = true;
              toast.error("An error occurred refreshing your session. Please sign in again.");
            }
            return;
          }
        }
        
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
            isInitializationComplete = true;
            console.log('👤 useSessionManager: State updated with session data, userId:', user.id);
            console.log('👤 useSessionManager: Auth checked set to true after session data loaded');
          }
        }
      } catch (error) {
        console.error('👤 useSessionManager: Exception checking session:', error);
        if (refs.isMounted.current) {
          setters.setError(error instanceof Error ? error.message : 'Unknown error');
          setters.setIsLoading(false);
          setters.setAuthCheckedOnce(true);
          isInitializationComplete = true;
          console.log('👤 useSessionManager: Auth checked set to true after exception');
        }
      }
    };
    
    // Check session immediately
    checkInitialSession();
    
    // Set up auth state change listener with better cleanup
    try {
      console.log('👤 useSessionManager: Setting up Supabase auth state change listener');
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`👤 useSessionManager: Auth state change event: ${event}`, {
          sessionExists: !!session,
          userId: session?.user?.id
        });
        
        if (!refs.isMounted.current) {
          console.log('👤 useSessionManager: Component unmounted, skipping auth state update');
          return;
        }
        
        // Always set authCheckedOnce to true for any non-initial auth event
        if (refs.isMounted.current && !event.includes('INITIAL')) {
          setters.setAuthCheckedOnce(true);
          console.log(`👤 useSessionManager: Auth checked explicitly set to true for event: ${event}`);
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
            setters.setError(null);
            console.log('👤 useSessionManager: State updated after sign in, userId:', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👤 useSessionManager: User signed out');
          if (refs.isMounted.current) {
            setters.setUserId(null);
            setters.setAuthProvider(null);
            setters.setIsLoading(false);
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
        console.log('👤 useSessionManager: Auth checked set to true after listener setup error');
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
