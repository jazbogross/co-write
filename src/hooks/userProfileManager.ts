
import { getUserProfile } from '@/services/authService';
import { AuthUser } from '@/services/authService';
import { SessionData } from './authListener/types';

export const getBasicUserData = (session: SessionData): AuthUser => {
  if (!session.user || !session.user.id) {
    throw new Error("Invalid session data: missing user ID");
  }
  
  console.log("🎧 UserProfileManager: Creating basic user data for:", session.user.id);
  
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
  console.log("🎧 UserProfileManager: Fetching user profile for", userId);
  
  try {
    console.log("🎧 UserProfileManager: Calling getUserProfile service");
    const { profile, error: profileError } = await getUserProfile(userId);
    
    if (!isMounted) {
      console.log("🎧 UserProfileManager: Component unmounted, skipping profile update");
      return { profile: null, error: profileError, shouldUpdate: false };
    }
    
    if (profileError) {
      console.error("🎧 UserProfileManager: Error fetching profile:", profileError);
      return { profile, error: profileError, shouldUpdate: true };
    }
    
    console.log("🎧 UserProfileManager: Profile fetched successfully:", profile ? 'exists' : 'null');
    return { profile, error: null, shouldUpdate: true };
  } catch (error) {
    console.error("🎧 UserProfileManager: Error in profile fetching:", error);
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
    console.error("🎧 UserProfileManager: Missing user ID when creating full user data");
    throw new Error("Cannot create user data without ID");
  }
  
  console.log("🎧 UserProfileManager: Creating full user data for:", userId, {
    email: email || 'not set',
    username: profile?.username || 'not set',
    provider
  });
  
  return {
    id: userId,
    email: profile?.email || email || null,
    username: profile?.username || null,
    provider: provider || 'email'
  };
};
