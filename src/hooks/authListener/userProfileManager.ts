
import { getUserProfile } from '@/services/authService';
import { AuthUser } from '@/services/authService';
import { SessionData } from './types';

export const getBasicUserData = (session: SessionData): AuthUser => {
  if (!session.user || !session.user.id) {
    throw new Error("Invalid session data: missing user ID");
  }
  
  return {
    id: session.user.id,
    email: session.user.email,
    provider: session.user.app_metadata?.provider || 'email'
  };
};

export const fetchUserProfile = async (userId: string, isMounted: boolean): Promise<{ 
  profile: any | null; 
  error: any | null;
  shouldUpdate: boolean;
}> => {
  console.log("🎧 AuthListener: Fetching user profile for", userId);
  
  try {
    const { profile, error: profileError } = await getUserProfile(userId);
    
    if (!isMounted) {
      console.log("🎧 AuthListener: Component unmounted, skipping profile update");
      return { profile: null, error: profileError, shouldUpdate: false };
    }
    
    if (profileError) {
      console.error("🎧 AuthListener: Error fetching profile:", profileError);
      return { profile, error: profileError, shouldUpdate: true };
    }
    
    return { profile, error: null, shouldUpdate: true };
  } catch (error) {
    console.error("🎧 AuthListener: Error in profile fetching:", error);
    return { profile: null, error, shouldUpdate: isMounted };
  }
};

export const createFullUserData = (
  userId: string, 
  email: string | undefined | null, 
  profile: any, 
  provider: string
): AuthUser => {
  // Ensure we have a valid user ID
  if (!userId) {
    console.error("🎧 AuthListener: Missing user ID when creating full user data");
    throw new Error("Cannot create user data without ID");
  }
  
  return {
    id: userId,
    email: profile?.email || email || null,
    username: profile?.username || null,
    provider: provider || 'email'
  };
};
