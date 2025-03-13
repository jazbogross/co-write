
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser } from '@/services/authService';
import { getUserProfile } from '@/services/authService';

interface UseAuthListenerResult {
  user: AuthUser | null;
  loading: boolean;
  authChecked: boolean;
}

export const useAuthListener = (): UseAuthListenerResult => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    console.log("🎧 AuthListener: Setting up authentication listener");
    let isMounted = true;
    
    const checkCurrentUser = async () => {
      console.log("🎧 AuthListener: Checking for current user session");
      try {
        const { data } = await supabase.auth.getUser();
        
        if (!isMounted) {
          console.log("🎧 AuthListener: Component unmounted, skipping state update");
          return;
        }
        
        if (data.user) {
          console.log("🎧 AuthListener: Initial check - Found user:", data.user.id);
          
          // Get user profile data
          const { profile } = await getUserProfile(data.user.id);
          
          if (isMounted) {
            console.log("🎧 AuthListener: Setting initial user state", {
              id: data.user.id,
              hasProfile: !!profile
            });
            
            setUser({
              id: data.user.id,
              email: data.user.email,
              username: profile?.username
            });
            setLoading(false);
            setAuthChecked(true); // Make sure this is set to true
          }
        } else {
          console.log("🎧 AuthListener: Initial check - No user found");
          if (isMounted) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true); // Make sure this is set to true
          }
        }
      } catch (error) {
        console.error("🎧 AuthListener: Error checking current user:", error);
        if (isMounted) {
          setUser(null);
          setLoading(false);
          setAuthChecked(true); // Make sure this is set to true
        }
      }
    };

    // Check current user immediately
    checkCurrentUser();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🎧 AuthListener: Auth state change event: ${event}`, {
        sessionExists: !!session,
        userId: session?.user?.id
      });
      
      if (!isMounted) {
        console.log("🎧 AuthListener: Component unmounted, skipping auth state change handling");
        return;
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("🎧 AuthListener: User signed in:", session.user.id);
        
        // Get user profile data
        const { profile } = await getUserProfile(session.user.id);
        
        if (isMounted) {
          console.log("🎧 AuthListener: Setting user state after sign in", {
            id: session.user.id,
            hasProfile: !!profile
          });
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: profile?.username
          });
          setLoading(false);
          setAuthChecked(true); // Always ensure this is true after an auth state change
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("🎧 AuthListener: User signed out");
        if (isMounted) {
          setUser(null);
          setLoading(false);
          setAuthChecked(true); // Always ensure this is true after an auth state change
        }
      } else if (event === 'USER_UPDATED') {
        console.log("🎧 AuthListener: User updated:", session?.user?.id);
        // Handle user update if needed
        if (session?.user && isMounted) {
          const { profile } = await getUserProfile(session.user.id);
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: profile?.username
          });
          setAuthChecked(true); // Always ensure this is true after an auth state change
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("🎧 AuthListener: Token refreshed for user:", session?.user?.id);
        // No need to update user state here as the session is just refreshed
        setAuthChecked(true); // Ensure this is true even for token refreshes
      }
    });

    return () => {
      console.log("🎧 AuthListener: Cleaning up auth listener");
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log("🎧 AuthListener: Auth state updated:", { 
      isAuthenticated: !!user, 
      loading, 
      authChecked,
      userId: user?.id
    });
  }, [user, loading, authChecked]);

  return { user, loading, authChecked };
};
