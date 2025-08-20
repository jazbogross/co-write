
import { supabase } from '@/integrations/supabase/client';
import { isSessionExpiring } from './useSessionExpirationChecker';
import { useTokenRefresher } from './useTokenRefresher';
import { useGitHubTokenManager } from '../useGitHubTokenManager';

interface InitialSessionCheckParams {
  isMounted: React.MutableRefObject<boolean>;
  setUserId: (id: string | null) => void;
  setAuthProvider: (provider: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setAuthCheckedOnce: (checked: boolean) => void;
}

export const useInitialSessionCheck = ({
  isMounted,
  setUserId,
  setAuthProvider,
  setIsLoading,
  setError,
  setAuthCheckedOnce,
}: InitialSessionCheckParams) => {
  const { refreshToken } = useTokenRefresher();
  const { handleGitHubToken } = useGitHubTokenManager();
  
  const checkInitialSession = async (): Promise<void> => {
    try {
      console.log('👤 useInitialSessionCheck: Checking for initial session...');
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      console.log('👤 useInitialSessionCheck: Session check result:', { 
        hasSession: !!sessionData?.session, 
        hasError: !!sessionError 
      });
      
      if (sessionError) {
        console.error('👤 useInitialSessionCheck: Error getting session:', sessionError);
        if (isMounted.current) {
          setError(sessionError.message);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          console.log('👤 useInitialSessionCheck: Auth checked set to true after session error');
        }
        return;
      }
      
      if (!sessionData.session) {
        console.log('👤 useInitialSessionCheck: No active session found');
        if (isMounted.current) {
          setUserId(null);
          setAuthProvider(null);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          console.log('👤 useInitialSessionCheck: Auth checked set to true after no session found');
        }
        return;
      }
      
      // We have an active session
      let currentUser = sessionData.session.user;
      console.log('👤 useInitialSessionCheck: Active session found, user ID:', currentUser.id);
      
      // Check if the session is about to expire (within 5 minutes)
      const fiveMinutesInSeconds = 5 * 60;
      if (isSessionExpiring(sessionData.session, fiveMinutesInSeconds)) {
        console.log('👤 useInitialSessionCheck: Token is about to expire, refreshing...');
        
        try {
          const { success, session, error: refreshError } = await refreshToken();
          
          if (!success || !session) {
            console.error('👤 useInitialSessionCheck: Failed to refresh token:', refreshError);
            // If refresh fails, sign the user out and redirect to login
            if (isMounted.current) {
              setUserId(null);
              setAuthProvider(null);
              setIsLoading(false);
              setAuthCheckedOnce(true);
              return;
            }
          }
          
          console.log('👤 useInitialSessionCheck: Token refreshed successfully');
          // Update session data with the refreshed session
          sessionData.session = session;
          currentUser = session.user;
        } catch (refreshException) {
          console.error('👤 useInitialSessionCheck: Exception during token refresh:', refreshException);
          if (isMounted.current) {
            setUserId(null);
            setAuthProvider(null);
            setIsLoading(false);
            setAuthCheckedOnce(true);
            return;
          }
        }
      }
      
      if (isMounted.current) {
        const provider = currentUser.app_metadata?.provider || null;
        console.log('👤 useInitialSessionCheck: Auth provider:', provider);
        
        // Update the github_access_token in profile if available
        if (provider === 'github' && sessionData.session.provider_token) {
          await handleGitHubToken(currentUser.id, currentUser.email, sessionData.session.provider_token);
        }
        
        if (isMounted.current) {
          setUserId(currentUser.id);
          setAuthProvider(provider);
          setIsLoading(false);
          setAuthCheckedOnce(true);
          setError(null);
          console.log('👤 useInitialSessionCheck: State updated with session data, userId:', currentUser.id);
          console.log('👤 useInitialSessionCheck: Auth checked set to true after session data loaded');
        }
      }
    } catch (error) {
      console.error('👤 useInitialSessionCheck: Exception checking session:', error);
      if (isMounted.current) {
        setError(error instanceof Error ? error.message : 'Unknown error');
        setIsLoading(false);
        setAuthCheckedOnce(true);
        console.log('👤 useInitialSessionCheck: Auth checked set to true after exception');
      }
    }
  };
  
  return { checkInitialSession };
};
