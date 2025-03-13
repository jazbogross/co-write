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
        // Immediately set session state based on session existence
        const { data: sessionData } = await supabase.auth.getSession();
        
        if (!isMounted) {
          console.log("🎧 AuthListener: Component unmounted, skipping state update");
          return;
        }
        
        // Immediately update authentication state if session exists
        const sessionExists = !!sessionData.session;
        if (sessionExists && sessionData.session?.user) {
          console.log("🎧 AuthListener: Session exists, setting isAuthenticated to true and basic user data");
          setIsAuthenticated(true);
          
          // Set basic user information immediately
          setUser({
            id: sessionData.session.user.id,
            email: sessionData.session.user.email,
            provider: sessionData.session.user.app_metadata?.provider || 'email'
          });
          
          // Set loading to false since we have the basic user data now
          setLoading(false);
        }
        
        const { data } = await supabase.auth.getUser();
        
        if (!isMounted) {
          console.log("🎧 AuthListener: Component unmounted, skipping state update");
          return;
        }
        
        if (data.user) {
          console.log("🎧 AuthListener: Initial check - Found user:", data.user.id);
          
          try {
            // Get user profile data
            const { profile, error: profileError } = await getUserProfile(data.user.id);
            
            if (profileError) {
              console.error("🎧 AuthListener: Error fetching profile:", profileError);
            }
            
            // Get provider from app_metadata if available
            const provider = data.user.app_metadata?.provider || 'email';
            
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
          } catch (profileError) {
            console.error("🎧 AuthListener: Error in profile fetching:", profileError);
            if (isMounted) {
              // Even if profile fetch fails, we still have a valid user
              setUser({
                id: data.user.id,
                email: data.user.email,
                provider: data.user.app_metadata?.provider || 'email'
              });
              setIsAuthenticated(true);
              setLoading(false);
            }
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
      
      // Immediately update authentication state if session exists
      if (session && session.user) {
        console.log("🎧 AuthListener: Session exists in auth event, setting isAuthenticated to true");
        setIsAuthenticated(true);
        
        // Set basic user information immediately
        setUser({
          id: session.user.id,
          email: session.user.email,
          provider: session.user.app_metadata?.provider || 'email'
        });
        
        // Set loading to false since we have the basic user data now
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setLoading(false);
      }
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log("🎧 AuthListener: User signed in:", session.user.id);
        
        try {
          // Get user profile data
          const { profile, error: profileError } = await getUserProfile(session.user.id);
          
          if (profileError) {
            console.error("🎧 AuthListener: Error fetching profile on sign in:", profileError);
          }
          
          // Get provider from app_metadata if available
          const provider = session.user.app_metadata?.provider || 'email';
          
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
        } catch (profileError) {
          console.error("🎧 AuthListener: Error fetching profile on sign in:", profileError);
          if (isMounted) {
            // Even if profile fetch fails, we still have authenticated user
            setUser({
              id: session.user.id,
              email: session.user.email,
              provider: session.user.app_metadata?.provider || 'email'
            });
            setIsAuthenticated(true);
            setLoading(false);
          }
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
          try {
            const { profile, error: profileError } = await getUserProfile(session.user.id);
            if (profileError) {
              console.error("🎧 AuthListener: Error fetching profile on user update:", profileError);
            }
            
            const provider = session.user.app_metadata?.provider || 'email';
            
            setUser({
              id: session.user.id,
              email: session.user.email,
              username: profile?.username,
              provider: provider
            });
            setIsAuthenticated(true);
            setLoading(false);
          } catch (profileError) {
            console.error("🎧 AuthListener: Error fetching profile on user update:", profileError);
            // Keep user authenticated even if profile fetch fails
            setUser({
              id: session.user.id,
              email: session.user.email,
              provider: session.user.app_metadata?.provider || 'email'
            });
            setIsAuthenticated(true);
            setLoading(false);
          }
        }
      } else if (event === 'TOKEN_REFRESHED') {
        console.log("🎧 AuthListener: Token refreshed for user:", session?.user?.id);
        // No need to update user state here as the session is just refreshed
        if (session?.user) {
          setIsAuthenticated(true);
          // Make sure loading is false
          setLoading(false);
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
