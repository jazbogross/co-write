
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { toast } from 'sonner';

export type AuthUser = {
  id: string;
  email?: string;
  username?: string;
  provider?: string | null;
};

export const useAuth = () => {
  const session = useSession();
  const supabase = useSupabaseClient();
  
  // Transform the Supabase user into our AuthUser type
  const user = session?.user ? {
    id: session.user.id,
    email: session.user.email,
    username: session.user.user_metadata?.username as string | undefined,
    provider: session.user.app_metadata?.provider as string | null
  } : null;

  const loading = false;
  const authChecked = true;
  
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
};
