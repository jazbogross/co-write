import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser } from '@/services/authService';
import { getUserProfile } from '@/services/authService';

interface UseAuthListenerResult {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export const useAuthListener = (): UseAuthListenerResult => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

          // Determine the provider from metadata or session info
          const { data: sessionData } = await supabase.auth.getSession();
          const provider = sessionData.session?.provider_id || 'email';
          
          if (isMounted) {
            console.log("🎧 AuthListener: Setting initial user state", {
              id: data.user.id,
              hasProfile: !!profile,
              provider: provider
            });
            
            setUser({
              id: data.user.id,
              email: data.user.email,
              username: profile?.username,
              provider: provider
            });
            setIsAuthenticated(true);
            setLoading(false);
          }
        } else {
          console.log("🎧 AuthListener: Initial check - No user found");
          if (isMounted) {
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("🎧 AuthListener: Error checking current user:", error);
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
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
        
        // Determine the provider
        const provider = session.provider_id || 'email';
        
        if (isMounted) {
          console.log("🎧 AuthListener: Setting user state after sign in", {
            id: session.user.id,
            hasProfile: !!profile,
            provider: provider
          });
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: profile?.username,
            provider: provider
          });
          setIsAuthenticated(true);
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log("🎧 AuthListener: User signed out");
        if (isMounted) {
          setUser(null);
          setIsAuthenticated(false);
          setLoading(false);
        }
      } else if (event === 'USER_UPDATED') {
        console.log("🎧 AuthListener: User updated:", session?.user?.id);
        // Handle user update if needed
        if (session?.user && isMounted) {
          const { profile } = await getUserProfile(session.user.id);
          const provider = session.provider_id || 'email';
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: profile?.username,
            provider: provider
          });
          setIsAuthenticated(true);
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("🎧 AuthListener: Token refreshed for user:", session?.user?.id);
        // No need to update user state here as the session is just refreshed
        if (session?.user) {
          setIsAuthenticated(true);
        }
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
      isAuthenticated, 
      loading, 
      userId: user?.id
    });
  }, [user, loading, isAuthenticated]);

  return { user, loading, isAuthenticated };
};
