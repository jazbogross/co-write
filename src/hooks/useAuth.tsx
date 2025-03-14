
import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuthListener';
import { signInWithPassword, signUpWithPassword, signOut as authSignOut, resetPassword as authResetPassword } from '@/services/authService';
import type { AuthUser } from '@/services/authService';
import { checkSessionStorage } from '@/utils/sessionDebug';

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, username: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  isAuthenticated: boolean;
}

// Create auth context with a default undefined value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  console.log("🔑 AuthProvider: Initializing");
  const { user, loading, isAuthenticated } = useAuthListener();

  // Check for persisted session on component mount
  useEffect(() => {
    const sessionStatus = checkSessionStorage();
    console.log("🔑 AuthProvider: Session persistence check:", sessionStatus.hasSupabaseToken);
  }, []);

  console.log("🔑 AuthProvider: Current state:", { 
    isAuthenticated, 
    loading, 
    userId: user?.id,
    userEmail: user?.email,
    location: window.location.pathname,
    timestamp: new Date().toISOString()
  });
  
  useEffect(() => {
    console.log("🔑 AuthProvider: State changed:", {
      isAuthenticated,
      loading,
      userId: user?.id,
      userEmail: user?.email,
      location: window.location.pathname
    });
  }, [isAuthenticated, loading, user]);

  const navigate = useNavigate();

  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: signIn: Starting for:", email);
    const { success } = await signInWithPassword(email, password);
    console.log("🔑 AuthProvider: signIn: Result:", success);
    if (success) {
      navigate('/');
    }
    return success;
  }, [navigate]);

  const signUp = useCallback(async (email: string, password: string, username: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: signUp: Starting for:", email);
    const { success } = await signUpWithPassword(email, password, username);
    console.log("🔑 AuthProvider: signUp: Result:", success);
    if (success) {
      navigate('/');
    }
    return success;
  }, [navigate]);

  const signOut = useCallback(async (): Promise<void> => {
    console.log("🔑 AuthProvider: signOut: Starting");
    const { success } = await authSignOut();
    console.log("🔑 AuthProvider: signOut: Result:", success);
    if (success) {
      navigate('/auth');
    }
  }, [navigate]);

  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: resetPassword: Starting for:", email);
    const { success } = await authResetPassword(email);
    console.log("🔑 AuthProvider: resetPassword: Result:", success);
    return success;
  }, []);

  // Provide a stable context value
  const contextValue: AuthContextType = {
    user, 
    loading, 
    signIn, 
    signUp, 
    signOut, 
    resetPassword,
    isAuthenticated
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
  
  return context;
};
