import { createContext, useContext, ReactNode, useEffect, useRef } from 'react';
import { useAuthState } from './auth/useAuthState';
import { useAuthListener } from './auth/useAuthListener';
import { useAuthActions } from './auth/useAuthActions';
import type { AuthUser } from '@/services/authService';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, username: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  authChecked: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log("🔑 AuthProvider: Initializing");
  
  const { state, setters, refs } = useAuthState();
  const { user, loading, authChecked } = state;
  const { setUser, setLoading, setAuthChecked } = setters;
  const { isMounted, authListenerCleanup } = refs;
  
  // Track initialization to prevent race conditions
  const isInitialized = useRef(false);
  
  // Set up auth listener
  useAuthListener(
    isMounted,
    authListenerCleanup,
    setUser,
    setLoading,
    setAuthChecked,
    isInitialized
  );
  
  // Get auth actions
  const actions = useAuthActions(setLoading);
  
  // Set up cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("🔑 AuthProvider: Unmounting, cleaning up");
      isMounted.current = false;
      
      // Clean up auth listener if it exists
      if (authListenerCleanup.current) {
        console.log("🔑 AuthProvider: Cleaning up auth listener on unmount");
        authListenerCleanup.current();
        authListenerCleanup.current = null;
      }
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("🔑 AuthProvider: State Updated:", { 
      isAuthenticated: !!user, 
      loading, 
      authChecked,
      userId: user?.id
    });
  }, [user, loading, authChecked]);

  // Return a stable context value
  const contextValue = {
    user, 
    loading, 
    authChecked,
    ...actions
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    console.error("🔑 useAuth: Must be used within an AuthProvider");
    throw new Error('useAuth must be used within an AuthProvider');
  }

  const { authChecked, loading, user } = context;

  // Prevent rendering until authChecked is true
  if (!authChecked) {
    console.log("🔑 useAuth: Waiting for auth check to complete");
    return { user: null, loading: true };
  }

  return context;
};
