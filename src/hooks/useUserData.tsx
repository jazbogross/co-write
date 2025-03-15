
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storeGitHubToken } from '@/services/githubProfileService';

export const useUserData = () => {
  console.log("👤 useUserData: Initializing user data check...");
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);
  const isMounted = useRef(true);
  const authListenerCleanup = useRef<(() => void) | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("👤 useUserData: Component unmounting, cleaning up");
      isMounted.current = false;
      
      // Clean up auth listener if it exists
      if (authListenerCleanup.current) {
        console.log("👤 useUserData: Cleaning up auth listener on unmount");
        authListenerCleanup.current();
        authListenerCleanup.current = null;
      }
    };
  }, []);

  // Check for initial session and set up auth state listener
  useEffect(() => {
    console.log('👤 useUserData: Initializing user data check...');
    
    const checkInitialSession = async () => {
      try {
        console.log('👤 useUserData: Checking for initial session...');
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('👤 useUserData: Error getting session:', sessionError);
          if (isMounted.current) {
            setError(sessionError.message);
            setIsLoading(false);
            setAuthCheckedOnce(true);
          }
          return;
        }
        
        if (!sessionData.session) {
          console.log('👤 useUserData: No active session found');
          if (isMounted.current) {
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
        
        if (isMounted.current) {
          const provider = user.app_metadata?.provider || null;
          console.log('👤 useUserData: Auth provider:', provider);
          
          // Update the github_access_token in profile if available
          if (provider === 'github' && sessionData.session.provider_token) {
            console.log('👤 useUserData: Storing GitHub token for user');
            try {
              await storeGitHubToken(user.id, user.email, sessionData.session.provider_token);
              console.log('👤 useUserData: GitHub token stored successfully');
            } catch (tokenError) {
              console.error('👤 useUserData: Error storing GitHub token:', tokenError);
              // Continue anyway - this shouldn't block the auth flow
            }
          }
          
          if (isMounted.current) {
            setUserId(user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
            console.log('👤 useUserData: State updated with session data, userId:', user.id);
          }
        }
      } catch (error) {
        console.error('👤 useUserData: Exception checking session:', error);
        if (isMounted.current) {
          setError(error instanceof Error ? error.message : 'Unknown error');
          setIsLoading(false);
          setAuthCheckedOnce(true);
        }
      }
    };
    
    // Check session immediately
    checkInitialSession();
    
    // Set up auth state change listener with better cleanup
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`👤 useUserData: Auth state change event: ${event}`, {
          sessionExists: !!session,
          userId: session?.user?.id
        });
        
        if (!isMounted.current) {
          console.log('👤 useUserData: Component unmounted, skipping auth state update');
          return;
        }
        
        if (event === 'SIGNED_IN' && session?.user) {
          console.log('👤 useUserData: User signed in:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          // Update GitHub token if available
          if (provider === 'github' && session.provider_token) {
            console.log('👤 useUserData: Storing GitHub token for user on sign in');
            try {
              await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
              console.log('👤 useUserData: GitHub token stored successfully on sign in');
            } catch (tokenError) {
              console.error('👤 useUserData: Error storing GitHub token on sign in:', tokenError);
              // Continue anyway - this shouldn't block the auth flow
            }
          }
          
          if (isMounted.current) {
            setUserId(session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
            console.log('👤 useUserData: State updated after sign in, userId:', session.user.id);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('👤 useUserData: User signed out');
          if (isMounted.current) {
            setUserId(null);
            setAuthProvider(null);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
          }
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          console.log('👤 useUserData: Token refreshed for user:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          // Update GitHub token if available
          if (provider === 'github' && session.provider_token) {
            console.log('👤 useUserData: Storing refreshed GitHub token');
            try {
              await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
              console.log('👤 useUserData: Refreshed GitHub token stored successfully');
            } catch (tokenError) {
              console.error('👤 useUserData: Error storing refreshed GitHub token:', tokenError);
              // Continue anyway - this shouldn't block the auth flow
            }
          }
          
          if (isMounted.current) {
            setUserId(session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
            console.log('👤 useUserData: State updated after token refresh, userId:', session.user.id);
          }
        } else if (event === 'USER_UPDATED' && session?.user) {
          console.log('👤 useUserData: User updated:', session.user.id);
          const provider = session.user.app_metadata?.provider || null;
          
          if (isMounted.current) {
            setUserId(session.user.id);
            setAuthProvider(provider);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            setError(null);
            console.log('👤 useUserData: State updated after user update, userId:', session.user.id);
          }
        }
      });

      // Store cleanup function
      authListenerCleanup.current = () => {
        console.log('👤 useUserData: Cleaning up auth listener via stored function');
        authListener.subscription.unsubscribe();
      };

    } catch (error) {
      console.error('👤 useUserData: Error setting up auth listener:', error);
      if (isMounted.current) {
        setError('Error setting up authentication listener');
        setIsLoading(false);
        setAuthCheckedOnce(true);
      }
    }
    
    return () => {
      if (authListenerCleanup.current) {
        console.log('👤 useUserData: Cleaning up auth listener on effect cleanup');
        authListenerCleanup.current();
        authListenerCleanup.current = null;
      }
    };
  }, []);

  // Log state updates
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
