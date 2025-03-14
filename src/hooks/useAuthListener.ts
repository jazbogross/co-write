
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AuthUser } from '@/services/authService';
import { UseAuthListenerResult, AuthState } from './authListener/types';
import { checkCurrentSession } from './authListener/sessionManager';
import { handleAuthStateChange } from './authListener/authEventHandler';

export const useAuthListener = (): UseAuthListenerResult => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    isAuthenticated: false
  });
  
  // Use refs to track initialization and component mounting
  const isInitializedRef = useRef(false);
  const isMountedRef = useRef(true);
  
  const updateState = useCallback((newState: Partial<AuthState>) => {
    if (isMountedRef.current) {
      setState(prev => ({ ...prev, ...newState }));
    }
  }, []);

  // Handle initial session check and setup auth listener
  useEffect(() => {
    console.log("🎧 AuthListener: Setting up authentication listener");
    // Using a more generic type to accommodate Supabase's subscription structure
    let authListenerSubscription: { data: any } | null = null;
    
    const initialize = async () => {
      try {
        // Skip initialization if already done
        if (isInitializedRef.current) {
          console.log("🎧 AuthListener: Already initialized, skipping");
          return;
        }
        
        isInitializedRef.current = true;
        
        // Check for current session
        const { sessionData, hasSession } = await checkCurrentSession();
        
        if (!isMountedRef.current) {
          console.log("🎧 AuthListener: Component unmounted during initialization");
          return;
        }
        
        if (hasSession && sessionData.session) {
          try {
            // Handle existing session
            await handleAuthStateChange('INITIAL_SESSION', sessionData.session, true, updateState);
          } catch (sessionError) {
            console.error("🎧 AuthListener: Error handling initial session:", sessionError);
            // Ensure loading is set to false even on error
            updateState({
              user: null,
              isAuthenticated: false,
              loading: false
            });
          }
        } else {
          // No session exists
          console.log("🎧 AuthListener: No session found, setting not authenticated");
          updateState({
            user: null,
            isAuthenticated: false,
            loading: false
          });
        }
      } catch (error) {
        console.error("🎧 AuthListener: Error checking current user:", error);
        if (isMountedRef.current) {
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
    try {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (isMountedRef.current) {
          try {
            await handleAuthStateChange(event, session, true, updateState);
          } catch (listenerError) {
            console.error("🎧 AuthListener: Error in auth state change handler:", listenerError);
            // Ensure loading is set to false even on error
            if (isMountedRef.current) {
              updateState({ loading: false });
            }
          }
        }
      });
      
      // Store the subscription object correctly
      authListenerSubscription = { data };
    } catch (subscriptionError) {
      console.error("🎧 AuthListener: Error setting up auth listener:", subscriptionError);
      // Ensure loading is set to false even on subscription error
      updateState({ loading: false });
    }

    return () => {
      console.log("🎧 AuthListener: Cleaning up auth listener");
      isMountedRef.current = false;
      if (authListenerSubscription && authListenerSubscription.data) {
        // Directly call the unsubscribe method on the data object
        if (typeof authListenerSubscription.data.unsubscribe === 'function') {
          authListenerSubscription.data.unsubscribe();
        }
      }
    };
  }, [updateState]);

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
