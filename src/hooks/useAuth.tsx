
import { createContext, useContext, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthListener } from '@/hooks/useAuthListener';
import { signInWithPassword, signUpWithPassword, signOut as authSignOut, resetPassword as authResetPassword } from '@/services/authService';
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
  const { user, loading, authChecked } = useAuthListener();
  const navigate = useNavigate();

  console.log("🔑 AuthProvider: Current state:", { 
    isAuthenticated: !!user, 
    loading, 
    authChecked,
    userId: user?.id
  });

  const signIn = async (email: string, password: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: signIn: Starting for:", email);
    const { success } = await signInWithPassword(email, password);
    console.log("🔑 AuthProvider: signIn: Result:", success);
    return success;
  };

  const signUp = async (email: string, password: string, username: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: signUp: Starting for:", email);
    const { success } = await signUpWithPassword(email, password, username);
    console.log("🔑 AuthProvider: signUp: Result:", success);
    return success;
  };

  const signOut = async (): Promise<void> => {
    console.log("🔑 AuthProvider: signOut: Starting");
    const { success } = await authSignOut();
    console.log("🔑 AuthProvider: signOut: Result:", success);
    if (success) {
      navigate('/auth');
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: resetPassword: Starting for:", email);
    const { success } = await authResetPassword(email);
    console.log("🔑 AuthProvider: resetPassword: Result:", success);
    return success;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signIn, 
      signUp, 
      signOut, 
      resetPassword,
      authChecked
    }}>
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
