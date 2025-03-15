
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserProfile } from '@/services/authService';

export const useAuthListener = (
  isMountedRef: React.MutableRefObject<boolean>,
  authListenerCleanupRef: React.MutableRefObject<(() => void) | null>,
  setUser: (user: any) => void,
  setLoading: (loading: boolean) => void,
  setAuthChecked: (checked: boolean) => void
) => {
  useEffect(() => {
    console.log("🔑 useAuthListener: Setting up auth state listener");
    
    const checkSession = async () => {
      try {
        console.log("🔑 useAuthListener: Checking for existing session");
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("🔑 useAuthListener: Session error:", sessionError);
          if (isMountedRef.current) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 useAuthListener: Auth checked set to true after session error");
          }
          return;
        }
        
        if (!sessionData.session) {
          console.log("🔑 useAuthListener: No active session");
          if (isMountedRef.current) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 useAuthListener: Auth checked set to true after no session found");
          }
          return;
        }
        
        // Session exists, get user data including profile
        const userId = sessionData.session.user.id;
        console.log("🔑 useAuthListener: Active session found for user:", userId);
        
        try {
          const { profile, error: profileError } = await getUserProfile(userId);
          
          if (profileError) {
            console.error("🔑 useAuthListener: Error fetching user profile:", profileError);
          }
          
          if (isMountedRef.current) {
            setUser({
              id: userId,
              email: sessionData.session.user.email,
              username: profile?.username
            });
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 useAuthListener: User set from session:", userId);
            console.log("🔑 useAuthListener: Auth checked set to true after user loaded");
          }
        } catch (profileError) {
          console.error("🔑 useAuthListener: Exception fetching profile:", profileError);
          if (isMountedRef.current) {
            // Still set the user with basic info even if profile fetch fails
            setUser({
              id: userId,
              email: sessionData.session.user.email
            });
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 useAuthListener: User set with basic info due to profile error:", userId);
            console.log("🔑 useAuthListener: Auth checked set to true after profile error");
          }
        }
      } catch (error) {
        console.error("🔑 useAuthListener: Error checking session:", error);
        if (isMountedRef.current) {
          setUser(null);
          setLoading(false);
          setAuthChecked(true);
          console.log("🔑 useAuthListener: Auth checked set to true after exception");
        }
      }
    };
    
    // Check for session immediately
    checkSession();
    
    // Set up auth listener
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔑 useAuthListener: Auth state change: ${event}`, {
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        if (!isMountedRef.current) {
          console.log("🔑 useAuthListener: Component unmounted, skipping auth state update");
          return;
        }
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          try {
            console.log(`🔑 useAuthListener: User ${event === 'SIGNED_IN' ? 'signed in' : 'token refreshed'}:`, session.user.id);
            const { profile } = await getUserProfile(session.user.id);
            
            if (isMountedRef.current) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                username: profile?.username
              });
              setLoading(false);
              setAuthChecked(true);
              console.log("🔑 useAuthListener: User state updated after auth change:", session.user.id);
              console.log("🔑 useAuthListener: Auth checked set to true after auth change");
            }
          } catch (error) {
            console.error(`🔑 useAuthListener: Error updating user after ${event}:`, error);
            if (isMountedRef.current) {
              // Still set basic user info even if profile fetch fails
              setUser({
                id: session.user.id,
                email: session.user.email
              });
              setLoading(false);
              setAuthChecked(true);
              console.log("🔑 useAuthListener: Auth checked set to true after auth change error");
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("🔑 useAuthListener: User signed out");
          if (isMountedRef.current) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 useAuthListener: Auth checked set to true after sign out");
          }
        } else if (event === 'USER_UPDATED' && session) {
          console.log("🔑 useAuthListener: User updated:", session.user.id);
          try {
            const { profile } = await getUserProfile(session.user.id);
            
            if (isMountedRef.current) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                username: profile?.username
              });
              setLoading(false);
              setAuthChecked(true);
              console.log("🔑 useAuthListener: Auth checked set to true after user update");
            }
          } catch (error) {
            console.error("🔑 useAuthListener: Error updating user after USER_UPDATED:", error);
            if (isMountedRef.current) {
              setUser({
                id: session.user.id,
                email: session.user.email
              });
              setLoading(false);
              setAuthChecked(true);
              console.log("🔑 useAuthListener: Auth checked set to true after user update error");
            }
          }
        } else {
          // For any other event, ensure we've properly set authChecked
          if (isMountedRef.current && !event.includes('INITIAL')) {
            setAuthChecked(true);
            console.log(`🔑 useAuthListener: Auth checked set to true after unhandled event: ${event}`);
          }
        }
      });

      // Store cleanup function
      authListenerCleanupRef.current = () => {
        console.log("🔑 useAuthListener: Cleaning up auth listener via stored cleanup function");
        authListener.subscription.unsubscribe();
      };

    } catch (error) {
      console.error("🔑 useAuthListener: Error setting up auth listener:", error);
      if (isMountedRef.current) {
        setLoading(false);
        setAuthChecked(true);
        console.log("🔑 useAuthListener: Auth checked set to true after listener setup error");
      }
    }
    
    return () => {
      if (authListenerCleanupRef.current) {
        console.log("🔑 useAuthListener: Cleaning up auth listener on effect cleanup");
        authListenerCleanupRef.current();
        authListenerCleanupRef.current = null;
      }
    };
  }, []); // Only run once on mount
};
