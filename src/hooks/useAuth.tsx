import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface AuthUser {
  id: string;
  email?: string;
  username?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (email: string, password: string, username: string) => Promise<boolean>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    
    const checkUser = async () => {
      try {
        console.log("🔑 AUTH: Checking for current user...");
        const { data } = await supabase.auth.getUser();
        
        if (data.user && isMounted) {
          console.log("🔑 AUTH: User found:", data.user.id);
          // Get user profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', data.user.id)
            .single();
          
          if (profileError) {
            console.error("🔑 AUTH: Error fetching profile:", profileError);
          }

          console.log("🔑 AUTH: Profile data:", profileData);
          
          if (isMounted) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              username: profileData?.username
            });
            console.log("🔑 AUTH: User state set successfully");
          }
        } else {
          console.log("🔑 AUTH: No user found");
        }
      } catch (error) {
        console.error('🔑 AUTH: Error checking authentication:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
          console.log("🔑 AUTH: Loading state set to false");
        }
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("🔑 AUTH: Auth state change event:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        if (isMounted) {
          console.log("🔑 AUTH: User signed in:", session.user.id);
          // Get user profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();
          
          if (profileError) {
            console.error("🔑 AUTH: Error fetching profile on sign in:", profileError);
          }
          
          console.log("🔑 AUTH: Profile data on sign in:", profileData);
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: profileData?.username
          });
          console.log("🔑 AUTH: User state updated after sign in");
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          console.log("🔑 AUTH: User signed out");
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
      console.log("🔑 AUTH: Cleanup - unsubscribed from auth listener");
    };
  }, []);

  useEffect(() => {
    console.log("🔑 AUTH: User state changed:", user ? "logged in" : "not logged in");
    console.log("🔑 AUTH: Loading state:", loading ? "loading" : "not loading");
  }, [user, loading]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      console.log("🔑 AUTH: Attempting sign in for email:", email);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        console.error("🔑 AUTH: Sign in error:", error.message);
        toast.error(error.message);
        return false;
      }
      
      console.log("🔑 AUTH: Sign in successful");
      toast.success('Signed in successfully!');
      return true;
    } catch (error) {
      console.error('🔑 AUTH: Error signing in:', error);
      toast.error('Failed to sign in');
      return false;
    }
  };

  const signUp = async (email: string, password: string, username: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      
      if (error) {
        toast.error(error.message);
        return false;
      }
      
      if (data.user) {
        // Create profile
        await supabase.from('profiles').insert({
          id: data.user.id,
          username,
          created_at: new Date().toISOString()
        });
        
        toast.success('Account created successfully!');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('🔑 AUTH: Error signing up:', error);
      toast.error('Failed to create account');
      return false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      toast.success('Signed out successfully');
      navigate('/auth');
    } catch (error) {
      console.error('🔑 AUTH: Error signing out:', error);
      toast.error('Failed to sign out');
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        toast.error(error.message);
        return false;
      }
      
      toast.success('Password reset link sent to your email');
      return true;
    } catch (error) {
      console.error('🔑 AUTH: Error resetting password:', error);
      toast.error('Failed to send password reset link');
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
