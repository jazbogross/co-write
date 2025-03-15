
import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { signInWithPassword, signUpWithPassword, signOut as authSignOut, resetPassword as authResetPassword, getUserProfile } from '@/services/authService';
import type { AuthUser } from '@/services/authService';
import { toast } from 'sonner';

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
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const navigate = useNavigate();

  // Check for session on mount and set up auth state listener
  useEffect(() => {
    console.log("🔑 AuthProvider: Setting up auth state");
    let mounted = true;
    
    const checkSession = async () => {
      try {
        setLoading(true);
        console.log("🔑 AuthProvider: Checking for existing session");
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("🔑 AuthProvider: Session error:", sessionError);
          if (mounted) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }
        
        if (!sessionData.session) {
          console.log("🔑 AuthProvider: No active session");
          if (mounted) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }
        
        // Session exists, get user data including profile
        const userId = sessionData.session.user.id;
        console.log("🔑 AuthProvider: Active session found for user:", userId);
        
        const { profile } = await getUserProfile(userId);
        
        if (mounted) {
          setUser({
            id: userId,
            email: sessionData.session.user.email,
            username: profile?.username
          });
          setLoading(false);
          setAuthChecked(true);
        }
      } catch (error) {
        console.error("🔑 AuthProvider: Error checking session:", error);
        if (mounted) {
          setUser(null);
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };
    
    // Check for session immediately
    checkSession();
    
    // Set up auth listener for changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔑 AuthProvider: Auth state change: ${event}`, {
        hasSession: !!session,
        userId: session?.user?.id
      });
      
      if (!mounted) return;
      
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
        try {
          const { profile } = await getUserProfile(session.user.id);
          
          if (mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email,
              username: profile?.username
            });
            setLoading(false);
            setAuthChecked(true);
          }
        } catch (error) {
          console.error("🔑 AuthProvider: Error updating user after auth change:", error);
        }
      } else if (event === 'SIGNED_OUT') {
        if (mounted) {
          setUser(null);
          setLoading(false);
          setAuthChecked(true);
        }
      }
    });
    
    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      console.log("🔑 AuthProvider: Cleaned up auth listener");
    };
  }, []);

  // Log state changes
  useEffect(() => {
    console.log("🔑 AuthProvider: Current state:", { 
      isAuthenticated: !!user, 
      loading, 
      authChecked,
      userId: user?.id
    });
  }, [user, loading, authChecked]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: signIn: Starting for:", email);
    setLoading(true);
    const { success } = await signInWithPassword(email, password);
    
    if (!success) {
      setLoading(false);
    }
    
    console.log("🔑 AuthProvider: signIn: Result:", success);
    return success;
  };

  const signUp = async (email: string, password: string, username: string): Promise<boolean> => {
    console.log("🔑 AuthProvider: signUp: Starting for:", email);
    setLoading(true);
    const { success } = await signUpWithPassword(email, password, username);
    
    if (!success) {
      setLoading(false);
    }
    
    console.log("🔑 AuthProvider: signUp: Result:", success);
    return success;
  };

  const signOut = async (): Promise<void> => {
    console.log("🔑 AuthProvider: signOut: Starting");
    setLoading(true);
    const { success } = await authSignOut();
    
    if (success) {
      navigate('/auth');
    } else {
      setLoading(false);
      toast.error('Failed to sign out');
    }
    
    console.log("🔑 AuthProvider: signOut: Result:", success);
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
