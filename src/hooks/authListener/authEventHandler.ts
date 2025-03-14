
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
  
  try {
    // Handle sign out event first
    if (event === 'SIGNED_OUT') {
      console.log("🎧 AuthListener: User signed out");
      setState({
        isAuthenticated: false,
        user: null,
        loading: false
      });
      return;
    }
    
    // For all other events, verify session exists
    if (!session || !session.user) {
      console.error("🎧 AuthListener: Invalid session in auth state change event");
      setState({
        isAuthenticated: false,
        user: null,
        loading: false
      });
      return;
    }
    
    // IMPORTANT: Set authenticated and loading to false as soon as we have basic user data
    // This ensures the UI updates right away with authenticated state
    updateStateFromSession(session, setState);
    
    // Handle specific events
    if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
      console.log("🎧 AuthListener: User signed in:", session.user.id);
      // Load full profile in the background, UI already updated to authenticated state
      await loadFullUserProfile(session, isMounted, setState);
    } else if (event === 'USER_UPDATED' && isMounted) {
      console.log("🎧 AuthListener: User updated:", session.user.id);
      await loadFullUserProfile(session, isMounted, setState);
    } else if (event === 'TOKEN_REFRESHED') {
      console.log("🎧 AuthListener: Token refreshed for user:", session.user.id);
      // No need to update user state here as the session is just refreshed
    }
  } catch (error) {
    console.error("🎧 AuthListener: Error handling auth state change:", error);
    // Always set loading to false even on error
    setState({ loading: false });
  }
};
