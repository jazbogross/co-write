
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface AuthUser {
  id: string;
  email?: string;
  username?: string;
  provider?: string | null;
}

export const getUser = async () => {
  console.log("🔐 AuthService: getUser: Fetching current user");
  try {
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error("🔐 AuthService: getUser: Error fetching user:", error);
      return { user: null, error };
    }
    
    if (!data.user) {
      console.log("🔐 AuthService: getUser: No user found");
      return { user: null, error: null };
    }
    
    console.log("🔐 AuthService: getUser: User found:", data.user.id);
    return { user: data.user, error: null };
  } catch (error) {
    console.error("🔐 AuthService: getUser: Exception:", error);
    return { user: null, error };
  }
};

export const getUserProfile = async (userId: string) => {
  console.log("🔐 AuthService: getUserProfile: Fetching profile for", userId);
  try {
    // Log the current session state to help with debugging
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("🔐 AuthService: Current session:", { session: sessionData?.session ? 'exists' : 'none' });
    
    const { data, error } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.error("🔐 AuthService: getUserProfile: Error fetching profile:", error);
      return { profile: null, error };
    }
    
    console.log("🔐 AuthService: getUserProfile: Profile found:", data);
    return { profile: data, error: null };
  } catch (error) {
    console.error("🔐 AuthService: getUserProfile: Exception:", error);
    return { profile: null, error };
  }
};

export const signInWithPassword = async (email: string, password: string) => {
  console.log("🔐 AuthService: signInWithPassword: Attempting sign in for:", email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password,
      options: {
        persistSession: true // Ensure session is persisted
      }
    });
    
    if (error) {
      console.error("🔐 AuthService: signInWithPassword: Error:", error.message);
      toast.error(error.message);
      return { success: false, error };
    }
    
    console.log("🔐 AuthService: signInWithPassword: Success for user:", data.user?.id);
    toast.success('Signed in successfully!');
    return { success: true, error: null };
  } catch (error) {
    console.error("🔐 AuthService: signInWithPassword: Exception:", error);
    toast.error('Failed to sign in');
    return { success: false, error };
  }
};

export const signUpWithPassword = async (email: string, password: string, username: string) => {
  console.log("🔐 AuthService: signUpWithPassword: Attempting sign up for:", email);
  try {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password,
      options: {
        data: { username }, // Store username in user metadata
        persistSession: true // Ensure session is persisted
      }
    });
    
    if (error) {
      console.error("🔐 AuthService: signUpWithPassword: Error:", error.message);
      toast.error(error.message);
      return { success: false, error };
    }
    
    if (data.user) {
      console.log("🔐 AuthService: signUpWithPassword: User created:", data.user.id);
      
      // Create profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        username,
        created_at: new Date().toISOString()
      });
      
      if (profileError) {
        console.error("🔐 AuthService: signUpWithPassword: Error creating profile:", profileError);
        toast.error("Account created but failed to set up profile");
        return { success: true, error: profileError };
      }
      
      console.log("🔐 AuthService: signUpWithPassword: Profile created successfully");
      toast.success('Account created successfully!');
      return { success: true, error: null };
    }
    
    console.warn("🔐 AuthService: signUpWithPassword: No user returned but no error");
    return { success: false, error: new Error("Failed to create account") };
  } catch (error) {
    console.error("🔐 AuthService: signUpWithPassword: Exception:", error);
    toast.error('Failed to create account');
    return { success: false, error };
  }
};

export const signOut = async () => {
  console.log("🔐 AuthService: signOut: Attempting sign out");
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    
    if (error) {
      console.error("🔐 AuthService: signOut: Error:", error.message);
      toast.error(error.message);
      return { success: false, error };
    }
    
    console.log("🔐 AuthService: signOut: Success");
    toast.success('Signed out successfully');
    return { success: true, error: null };
  } catch (error) {
    console.error("🔐 AuthService: signOut: Exception:", error);
    toast.error('Failed to sign out');
    return { success: false, error };
  }
};

export const resetPassword = async (email: string) => {
  console.log("🔐 AuthService: resetPassword: Attempting reset for:", email);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    
    if (error) {
      console.error("🔐 AuthService: resetPassword: Error:", error.message);
      toast.error(error.message);
      return { success: false, error };
    }
    
    console.log("🔐 AuthService: resetPassword: Reset email sent");
    toast.success('Password reset link sent to your email');
    return { success: true, error: null };
  } catch (error) {
    console.error("🔐 AuthService: resetPassword: Exception:", error);
    toast.error('Failed to send password reset link');
    return { success: false, error };
  }
};
