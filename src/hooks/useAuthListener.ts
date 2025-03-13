
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
  
  // Use a ref to track initialization and component mounting
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
        
        if (!isMountedRef.current) return;
        
        if (hasSession && sessionData.session) {
          // Handle existing session
          handleAuthStateChange('SIGNED_IN', sessionData.session, true, updateState);
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
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isMountedRef.current) {
        await handleAuthStateChange(event, session, true, updateState);
      }
    });

    return () => {
      console.log("🎧 AuthListener: Cleaning up auth listener");
      isMountedRef.current = false;
      authListener.subscription.unsubscribe();
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
