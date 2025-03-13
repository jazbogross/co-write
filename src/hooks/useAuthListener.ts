
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser } from '@/services/authService';
import { UseAuthListenerResult, AuthState } from './authListener/types';
import { checkCurrentSession, updateStateFromSession, loadFullUserProfile } from './authListener/sessionManager';
import { handleAuthStateChange } from './authListener/authEventHandler';

export const useAuthListener = (): UseAuthListenerResult => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false
  });
  
  // Use a ref to track initialization and avoid duplicate work
  const isInitializedRef = useRef(false);
  
  const updateState = (newState: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  useEffect(() => {
    console.log("🎧 AuthListener: Setting up authentication listener");
    let isMounted = true;
    
    const initialize = async () => {
      try {
        // Skip initialization if already done
        if (isInitializedRef.current) {
          console.log("🎧 AuthListener: Already initialized, skipping");
          return;
        }
        
        isInitializedRef.current = true;
        
        // Check for current session
        const { sessionData, hasSession } = await checkCurrentSession(isMounted);
        
        if (!isMounted) return;
        
        if (hasSession && sessionData.session) {
          // Make sure we safely access session and user
          if (sessionData.session.user) {
            console.log("🎧 AuthListener: Session found for user:", sessionData.session.user.id);
            updateStateFromSession(sessionData.session, updateState);
            
            // Load full profile data in the background
            loadFullUserProfile(sessionData.session, isMounted, updateState);
          } else {
            // Session exists but user data is missing
            console.error("🎧 AuthListener: Session exists but user data is missing");
            updateState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
        } else {
          // No session exists
          console.log("🎧 AuthListener: No session found, setting not authenticated");
          if (isMounted) {
            updateState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
        }
      } catch (error) {
        console.error("🎧 AuthListener: Error checking current user:", error);
        if (isMounted) {
          updateState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      }
    };

    // Initialize immediately
    initialize();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      await handleAuthStateChange(event, session, isMounted, updateState);
    });

    return () => {
      console.log("🎧 AuthListener: Cleaning up auth listener");
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    console.log("🎧 AuthListener: Auth state updated:", { 
      isAuthenticated: state.isAuthenticated, 
      loading: state.loading, 
      userId: state.user?.id
    });
  }, [state.user, state.loading, state.isAuthenticated]);

  return {
    user: state.user,
    loading: state.loading,
    isAuthenticated: state.isAuthenticated
  };
};
