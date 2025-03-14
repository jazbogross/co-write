
import { supabase } from '@/integrations/supabase/client';
import { AuthState, SessionData } from './types';
import { getBasicUserData, fetchUserProfile, createFullUserData } from './userProfileManager';

export const checkCurrentSession = async (): Promise<{
  sessionData: any;
  hasSession: boolean;
}> => {
  console.log("🎧 AuthListener: Checking for current user session");
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const hasSession = !!sessionData.session && !!sessionData.session.user;
    
    console.log("🎧 AuthListener: Session check result:", { 
      hasSession, 
      userId: hasSession ? sessionData.session?.user?.id : 'none' 
    });
    
    return { sessionData, hasSession };
  } catch (error) {
    console.error("🎧 AuthListener: Error checking session:", error);
    return { sessionData: {}, hasSession: false };
  }
};

export const updateStateFromSession = (
  session: SessionData,
  setState: (state: Partial<AuthState>) => void,
): void => {
  try {
    console.log("🎧 AuthListener: Updating state from session");
    
    // Validate session data
    if (!session?.user?.id) {
      console.error("🎧 AuthListener: Session user data is invalid");
      setState({
        user: null,
        isAuthenticated: false,
        loading: false
      });
      return;
    }
    
    // Create basic user data from session
    const basicUserData = getBasicUserData(session);
    
    // IMPORTANT: Set authenticated and loading to false as soon as we have basic user data
    setState({
      user: basicUserData,
      isAuthenticated: true,
      loading: false
    });
    
    console.log("🎧 AuthListener: Session exists, setting isAuthenticated to true and basic user data");
  } catch (error) {
    console.error("🎧 AuthListener: Error updating state from session:", error);
    setState({
      user: null,
      isAuthenticated: false,
      loading: false
    });
  }
};

export const loadFullUserProfile = async (
  session: SessionData,
  isMounted: boolean,
  setState: (state: Partial<AuthState>) => void
): Promise<void> => {
  try {
    if (!session?.user?.id) {
      console.error("🎧 AuthListener: Cannot load profile, user data is invalid");
      setState({ loading: false });
      return;
    }
    
    const userId = session.user.id;
    
    // Get detailed user profile
    const { profile, error, shouldUpdate } = await fetchUserProfile(userId, isMounted);
    
    if (!shouldUpdate) {
      return;
    }
    
    if (error) {
      // Even if profile fetch fails, we still have a valid user
      console.log("🎧 AuthListener: Using basic user data due to profile fetch error");
      // Make sure loading is false even on error
      setState({ loading: false });
      return;
    }
    
    // Get provider from app_metadata if available
    const provider = session.user.app_metadata?.provider || 'email';
    
    if (isMounted) {
      console.log("🎧 AuthListener: Setting full user data with profile");
      setState({
        user: createFullUserData(userId, session.user.email, profile, provider),
        loading: false
      });
    }
  } catch (error) {
    console.error("🎧 AuthListener: Error loading full user profile:", error);
    // Always set loading to false on error
    setState({ loading: false });
  }
};
