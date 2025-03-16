
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getUserProfile } from '@/services/authService';

export const useAuthListener = (
  isMountedRef: React.MutableRefObject<boolean>,
  authListenerCleanupRef: React.MutableRefObject<(() => void) | null>,
  setUser: (user: any) => void,
  setLoading: (loading: boolean) => void,
  setAuthChecked: (checked: boolean) => void,
  isInitializedRef: React.MutableRefObject<boolean>
) => {
  useEffect(() => {
    console.log("🔑 useAuthListener: Setting up auth state listener");
    
    const checkSession = async () => {
      try {
        // Skip if initialization was already completed
        if (isInitializedRef.current) {
          console.log("🔑 useAuthListener: Authentication already initialized, skipping session check");
          return;
        }

        console.log("🔑 useAuthListener: Checking for existing session");
        
        // Check for existing session and refresh token if needed
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log("🔑 useAuthListener: Session check result:", { 
          hasSession: !!sessionData?.session, 
          hasError: !!sessionError 
        });
        
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
            // Mark initialization as complete
            isInitializedRef.current = true;
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
            // Mark initialization as complete even if there was an error
            isInitializedRef.current = true;
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
    
    // Set up auth listener with retry mechanism
    try {
      console.log("🔑 useAuthListener: Setting up Supabase auth state change listener");
      
      // Set up the auth state change listener
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔑 useAuthListener: Auth state change: ${event}`, {
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        if (!isMountedRef.current) {
          console.log("🔑 useAuthListener: Component unmounted, skipping auth state update");
          return;
        }

        // Always ensure authChecked gets set to true for any auth event
        // This ensures we don't get stuck in loading state
        if (isMountedRef.current && !event.includes('INITIAL')) {
          setAuthChecked(true);
          console.log(`🔑 useAuthListener: Auth checked explicitly set to true for event: ${event}`);
        }
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          try {
            console.log(`🔑 useAuthListener: User ${event === 'SIGNED_IN' ? 'signed in' : 'token refreshed'}:`, session.user.id);
            
            // First, update the loading state to indicate we're fetching profile
            if (isMountedRef.current) {
              setLoading(true);
            }
            
            const { profile } = await getUserProfile(session.user.id);
            
            if (isMountedRef.current) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                username: profile?.username
              });
              setLoading(false);
              // Mark initialization as complete
              isInitializedRef.current = true;
              console.log("🔑 useAuthListener: User state updated after auth change:", session.user.id);
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
              // Mark initialization as complete even if there was an error
              isInitializedRef.current = true;
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("🔑 useAuthListener: User signed out");
          if (isMountedRef.current) {
            setUser(null);
            setLoading(false);
            // Reset initialization flag on sign out
            isInitializedRef.current = false;
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
              // Mark initialization as complete
              isInitializedRef.current = true;
            }
          } catch (error) {
            console.error("🔑 useAuthListener: Error updating user after USER_UPDATED:", error);
            if (isMountedRef.current) {
              setUser({
                id: session.user.id,
                email: session.user.email
              });
              setLoading(false);
            }
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
        setUser(null);
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
