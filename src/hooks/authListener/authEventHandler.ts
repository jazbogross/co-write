
import { AuthState, AuthEventData } from './types';
import { updateStateFromSession, loadFullUserProfile } from './sessionManager';

export const handleAuthStateChange = async (
  event: string,
  session: any,
  isMounted: boolean,
  setState: (state: Partial<AuthState>) => void
): Promise<void> => {
  console.log(`🎧 AuthListener: Auth state change event: ${event}`, {
    sessionExists: !!session,
    userId: session?.user?.id
  });
  
  if (!isMounted) {
    console.log("🎧 AuthListener: Component unmounted, skipping auth state change handling");
    return;
  }
  
  // Immediately update authentication state if session exists
  if (session && session.user) {
    updateStateFromSession(session, setState);
  } else if (event === 'SIGNED_OUT') {
    setState({
      isAuthenticated: false,
      user: null,
      loading: false
    });
  }
  
  if (event === 'SIGNED_IN' && session?.user) {
    console.log("🎧 AuthListener: User signed in:", session.user.id);
    await loadFullUserProfile(session, isMounted, setState);
  } else if (event === 'USER_UPDATED' && session?.user && isMounted) {
    console.log("🎧 AuthListener: User updated:", session.user.id);
    await loadFullUserProfile(session, isMounted, setState);
  } else if (event === 'TOKEN_REFRESHED' && session?.user) {
    console.log("🎧 AuthListener: Token refreshed for user:", session.user.id);
    // No need to update user state here as the session is just refreshed
  }
};
