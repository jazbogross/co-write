
import { supabase } from '@/integrations/supabase/client';
import { AuthState, SessionData } from './types';
import { getBasicUserData, fetchUserProfile, createFullUserData } from './userProfileManager';

export const checkCurrentSession = async (isMounted: boolean): Promise<{
  sessionData: any;
  hasSession: boolean;
}> => {
  console.log("🎧 AuthListener: Checking for current user session");
  const { data: sessionData } = await supabase.auth.getSession();
  const hasSession = !!sessionData.session;
  
  return { sessionData, hasSession };
};

export const updateStateFromSession = (
  session: SessionData,
  setState: (state: Partial<AuthState>) => void,
): void => {
  console.log("🎧 AuthListener: Session exists, setting isAuthenticated to true and basic user data");
  const basicUserData = getBasicUserData(session);
  
  setState({
    user: basicUserData,
    isAuthenticated: true,
    loading: false
  });
};

export const loadFullUserProfile = async (
  session: SessionData,
  isMounted: boolean,
  setState: (state: Partial<AuthState>) => void
): Promise<void> => {
  const userId = session.user.id;
  
  // Get detailed user profile
  const { profile, error, shouldUpdate } = await fetchUserProfile(userId, isMounted);
  
  if (!shouldUpdate) {
    return;
  }
  
  if (error) {
    // Even if profile fetch fails, we still have a valid user
    console.log("🎧 AuthListener: Using basic user data due to profile fetch error");
    return;
  }
  
  // Get provider from app_metadata if available
  const provider = session.user.app_metadata?.provider || 'email';
  
  if (isMounted) {
    console.log("🎧 AuthListener: Setting full user data with profile");
    setState({
      user: createFullUserData(userId, session.user.email, profile, provider)
    });
  }
};
