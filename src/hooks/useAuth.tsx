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
        console.log("Checking for current user...");
        const { data } = await supabase.auth.getUser();
        
        if (data.user && isMounted) {
          console.log("User found:", data.user.id);
          // Get user profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', data.user.id)
            .single();
          
          if (isMounted) {
            setUser({
              id: data.user.id,
              email: data.user.email,
              username: profileData?.username
            });
          }
        }
      } catch (error) {
        console.error('Error checking authentication:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    checkUser();

    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state change event:", event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        if (isMounted) {
          console.log("User signed in:", session.user.id);
          // Get user profile data
          const { data: profileData } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', session.user.id)
            .single();
          
          setUser({
            id: session.user.id,
            email: session.user.email,
            username: profileData?.username
          });
        }
      } else if (event === 'SIGNED_OUT') {
        if (isMounted) {
          console.log("User signed out");
          setUser(null);
        }
      }
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && !loading) {
      navigate('/profile');
    }
  }, [user, loading, navigate]);

  const signIn = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        toast.error(error.message);
        return false;
      }
      
      toast.success('Signed in successfully!');
      return true;
    } catch (error) {
      console.error('Error signing in:', error);
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
      console.error('Error signing up:', error);
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
      console.error('Error signing out:', error);
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
      console.error('Error resetting password:', error);
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
