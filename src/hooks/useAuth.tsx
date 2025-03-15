
import { createContext, useContext, ReactNode, useState, useEffect, useRef } from 'react';
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
  const isMounted = useRef(true);
  const authListenerCleanup = useRef<(() => void) | null>(null);

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

  // Check for session on mount and set up auth state listener
  useEffect(() => {
    console.log("🔑 AuthProvider: Setting up auth state");
    
    const checkSession = async () => {
      try {
        console.log("🔑 AuthProvider: Checking for existing session");
        
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error("🔑 AuthProvider: Session error:", sessionError);
          if (isMounted.current) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }
        
        if (!sessionData.session) {
          console.log("🔑 AuthProvider: No active session");
          if (isMounted.current) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
          }
          return;
        }
        
        // Session exists, get user data including profile
        const userId = sessionData.session.user.id;
        console.log("🔑 AuthProvider: Active session found for user:", userId);
        
        try {
          const { profile, error: profileError } = await getUserProfile(userId);
          
          if (profileError) {
            console.error("🔑 AuthProvider: Error fetching user profile:", profileError);
          }
          
          if (isMounted.current) {
            setUser({
              id: userId,
              email: sessionData.session.user.email,
              username: profile?.username
            });
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 AuthProvider: User set from session:", userId);
          }
        } catch (profileError) {
          console.error("🔑 AuthProvider: Exception fetching profile:", profileError);
          if (isMounted.current) {
            // Still set the user with basic info even if profile fetch fails
            setUser({
              id: userId,
              email: sessionData.session.user.email
            });
            setLoading(false);
            setAuthChecked(true);
            console.log("🔑 AuthProvider: User set with basic info due to profile error:", userId);
          }
        }
      } catch (error) {
        console.error("🔑 AuthProvider: Error checking session:", error);
        if (isMounted.current) {
          setUser(null);
          setLoading(false);
          setAuthChecked(true);
        }
      }
    };
    
    // Check for session immediately
    checkSession();
    
    // Set up auth listener with better error handling
    try {
      const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log(`🔑 AuthProvider: Auth state change: ${event}`, {
          hasSession: !!session,
          userId: session?.user?.id
        });
        
        if (!isMounted.current) {
          console.log("🔑 AuthProvider: Component unmounted, skipping auth state update");
          return;
        }
        
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          try {
            console.log(`🔑 AuthProvider: User ${event === 'SIGNED_IN' ? 'signed in' : 'token refreshed'}:`, session.user.id);
            const { profile } = await getUserProfile(session.user.id);
            
            if (isMounted.current) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                username: profile?.username
              });
              setLoading(false);
              setAuthChecked(true);
              console.log("🔑 AuthProvider: User state updated after auth change:", session.user.id);
            }
          } catch (error) {
            console.error(`🔑 AuthProvider: Error updating user after ${event}:`, error);
            if (isMounted.current) {
              // Still set basic user info even if profile fetch fails
              setUser({
                id: session.user.id,
                email: session.user.email
              });
              setLoading(false);
              setAuthChecked(true);
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log("🔑 AuthProvider: User signed out");
          if (isMounted.current) {
            setUser(null);
            setLoading(false);
            setAuthChecked(true);
          }
        } else if (event === 'USER_UPDATED' && session) {
          console.log("🔑 AuthProvider: User updated:", session.user.id);
          try {
            const { profile } = await getUserProfile(session.user.id);
            
            if (isMounted.current) {
              setUser({
                id: session.user.id,
                email: session.user.email,
                username: profile?.username
              });
              setLoading(false);
              setAuthChecked(true);
            }
          } catch (error) {
            console.error("🔑 AuthProvider: Error updating user after USER_UPDATED:", error);
          }
        }
      });

      // Store cleanup function
      authListenerCleanup.current = () => {
        console.log("🔑 AuthProvider: Cleaning up auth listener via stored cleanup function");
        authListener.subscription.unsubscribe();
      };

    } catch (error) {
      console.error("🔑 AuthProvider: Error setting up auth listener:", error);
      if (isMounted.current) {
        setLoading(false);
        setAuthChecked(true);
      }
    }
    
    return () => {
      if (authListenerCleanup.current) {
        console.log("🔑 AuthProvider: Cleaning up auth listener on effect cleanup");
        authListenerCleanup.current();
        authListenerCleanup.current = null;
      }
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
