
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { storeGitHubToken } from '@/services/githubProfileService';

export const useUserData = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authProvider, setAuthProvider] = useState<string | null>(null);
  const [authCheckedOnce, setAuthCheckedOnce] = useState(false);

  // Check for initial session and set up auth state listener
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
          console.log('👤 useUserData: Auth provider:', provider);
          
          // Update the github_access_token in profile if available
          if (provider === 'github' && sessionData.session.provider_token) {
            console.log('👤 useUserData: Storing GitHub token for user');
            await storeGitHubToken(user.id, user.email, sessionData.session.provider_token);
          }
          
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
    
    // Check session immediately
    checkInitialSession();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`👤 useUserData: Auth state change event: ${event}`, {
        sessionExists: !!session,
        userId: session?.user?.id
      });
      
      if (!mounted) {
        console.log('👤 useUserData: Component unmounted, skipping auth state update');
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 useUserData: User signed in:', session.user.id);
        const provider = session.user.app_metadata?.provider || null;
        
        // Update GitHub token if available
        if (provider === 'github' && session.provider_token) {
          console.log('👤 useUserData: Storing GitHub token for user on sign in');
          await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
        }
        
        setUserId(session.user.id);
        setAuthProvider(provider);
        setIsLoading(false);
        setAuthCheckedOnce(true);
        setError(null);
      } else if (event === 'SIGNED_OUT') {
        console.log('👤 useUserData: User signed out');
        setUserId(null);
        setAuthProvider(null);
        setIsLoading(false);
        setAuthCheckedOnce(true);
        setError(null);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        console.log('👤 useUserData: Token refreshed for user:', session.user.id);
        const provider = session.user.app_metadata?.provider || null;
        
        // Update GitHub token if available
        if (provider === 'github' && session.provider_token) {
          console.log('👤 useUserData: Storing refreshed GitHub token');
          await storeGitHubToken(session.user.id, session.user.email, session.provider_token);
        }
        
        setUserId(session.user.id);
        setAuthProvider(provider);
        setIsLoading(false);
        setAuthCheckedOnce(true);
        setError(null);
      }
    });
    
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      console.log('👤 useUserData: Cleanup - unsubscribed from auth listener');
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
