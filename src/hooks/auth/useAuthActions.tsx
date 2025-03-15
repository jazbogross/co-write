
import { useNavigate } from 'react-router-dom';
import { signInWithPassword, signUpWithPassword, signOut as authSignOut, resetPassword as authResetPassword } from '@/services/authService';
import { toast } from 'sonner';

export const useAuthActions = (setLoading: (loading: boolean) => void) => {
  const navigate = useNavigate();

  const signIn = async (email: string, password: string): Promise<boolean> => {
    console.log("🔑 useAuthActions: signIn: Starting for:", email);
    setLoading(true);
    const { success } = await signInWithPassword(email, password);
    
    if (!success) {
      setLoading(false);
    }
    
    console.log("🔑 useAuthActions: signIn: Result:", success);
    return success;
  };

  const signUp = async (email: string, password: string, username: string): Promise<boolean> => {
    console.log("🔑 useAuthActions: signUp: Starting for:", email);
    setLoading(true);
    const { success } = await signUpWithPassword(email, password, username);
    
    if (!success) {
      setLoading(false);
    }
    
    console.log("🔑 useAuthActions: signUp: Result:", success);
    return success;
  };

  const signOut = async (): Promise<void> => {
    console.log("🔑 useAuthActions: signOut: Starting");
    setLoading(true);
    const { success } = await authSignOut();
    
    if (success) {
      navigate('/auth');
    } else {
      setLoading(false);
      toast.error('Failed to sign out');
    }
    
    console.log("🔑 useAuthActions: signOut: Result:", success);
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    console.log("🔑 useAuthActions: resetPassword: Starting for:", email);
    const { success } = await authResetPassword(email);
    console.log("🔑 useAuthActions: resetPassword: Result:", success);
    return success;
  };

  return {
    signIn,
    signUp,
    signOut,
    resetPassword
  };
};
