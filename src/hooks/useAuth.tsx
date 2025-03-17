
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, createContext, useContext, ReactNode } from 'react';

export type AuthUser = {
  id: string;
  email?: string;
  username?: string;
  provider?: string | null;
};

// Create a context to track authentication status
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const authState = useAuthState();
  
  return (
    <AuthContext.Provider value={authState}>
      {children}
    </AuthContext.Provider>
  );
};

// Internal hook that provides auth functionality
function useAuthState() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Transform the Supabase user into our AuthUser type
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    username: session.user.user_metadata?.username as string | undefined,
    provider: session.user.app_metadata?.provider as string | null
  } : null;

  const loading = false;
  const authChecked = true;
  
  // Handle redirects for protected routes
  useEffect(() => {
    if (authChecked && !user && location.pathname !== '/auth') {
      // Don't automatically redirect from public pages
      const publicPages = ['/', '/scripts'];
      if (!publicPages.some(page => location.pathname.startsWith(page))) {
        console.log('🔑 useAuth: User not authenticated, redirecting to auth page from', location.pathname);
        navigate('/auth', { state: { from: location.pathname } });
      }
    }
  }, [user, authChecked, navigate, location.pathname]);
  
  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast.error(error.message);
        return false;
      }
      
      toast.success('Signed in successfully');
      return true;
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in');
      return false;
    }
  };
  
  const signUp = async (email: string, password: string, username: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username }
        }
      });
      
      if (error) {
        toast.error(error.message);
        return false;
      }
      
      toast.success('Account created successfully!');
      return true;
    } catch (error) {
      console.error('Sign up error:', error);
      toast.error('Failed to create account');
      return false;
    }
  };
  
  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        toast.error(error.message);
        return;
      }
      
      toast.success('Signed out successfully');
      // No automatic redirect after sign out
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };
  
  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        toast.error(error.message);
        return false;
      }
      
      toast.success('Password reset email sent');
      return true;
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('Failed to send reset password email');
      return false;
    }
  };
  
  return {
    user,
    loading,
    authChecked,
    signIn,
    signUp,
    signOut,
    resetPassword
  };
}

// Export the hook for use in components
export const useAuth = () => {
  const context = useContext(AuthContext);
  
  if (!context) {
    console.error('🔑 useAuth: Must be used within an AuthProvider');
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
};
