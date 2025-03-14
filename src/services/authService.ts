
import { supabase } from '@/integrations/supabase/client';

export interface AuthUser {
  id: string;
  email?: string | null;
  username?: string | null;
  provider?: string | null;
}

export const signInWithPassword = async (email: string, password: string) => {
  console.log("🔐 AuthService: signInWithPassword: Starting for:", email);
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("🔐 AuthService: signInWithPassword: Error:", error);
      return { success: false, error };
    }

    console.log("🔐 AuthService: signInWithPassword: Success, user:", data.user?.id);
    console.log("🔐 AuthService: signInWithPassword: Session:", {
      hasSession: !!data.session,
      expiresAt: data.session?.expires_at,
      tokenType: data.session?.token_type
    });
    
    return { success: true, session: data.session };
  } catch (error) {
    console.error("🔐 AuthService: signInWithPassword: Exception:", error);
    return { success: false, error };
  }
};

export const signUpWithPassword = async (email: string, password: string, username: string) => {
  console.log("🔐 AuthService: signUpWithPassword: Starting for:", email);
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
        },
      },
    });

    if (error) {
      console.error("🔐 AuthService: signUpWithPassword: Error:", error);
      return { success: false, error };
    }

    console.log("🔐 AuthService: signUpWithPassword: Success, user:", data.user?.id);
    console.log("🔐 AuthService: signUpWithPassword: Session:", {
      hasSession: !!data.session,
      expiresAt: data.session?.expires_at
    });

    if (data.user) {
      await updateUserProfile(data.user.id, username);
    }

    return { success: true, session: data.session };
  } catch (error) {
    console.error("🔐 AuthService: signUpWithPassword: Exception:", error);
    return { success: false, error };
  }
};

export const signOut = async () => {
  console.log("🔐 AuthService: signOut: Starting");
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("🔐 AuthService: signOut: Error:", error);
      return { success: false, error };
    }

    console.log("🔐 AuthService: signOut: Success");
    return { success: true };
  } catch (error) {
    console.error("🔐 AuthService: signOut: Exception:", error);
    return { success: false, error };
  }
};

export const resetPassword = async (email: string) => {
  console.log("🔐 AuthService: resetPassword: Starting for:", email);
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      console.error("🔐 AuthService: resetPassword: Error:", error);
      return { success: false, error };
    }

    console.log("🔐 AuthService: resetPassword: Success");
    return { success: true };
  } catch (error) {
    console.error("🔐 AuthService: resetPassword: Exception:", error);
    return { success: false, error };
  }
};

const updateUserProfile = async (userId: string, username: string) => {
  console.log("🔐 AuthService: updateUserProfile: Updating profile for", userId, "with username", username);
  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: userId, username: username });

    if (error) {
      console.error("🔐 AuthService: updateUserProfile: Error:", error);
      throw error;
    }

    console.log("🔐 AuthService: updateUserProfile: Success");
  } catch (error) {
    console.error("🔐 AuthService: updateUserProfile: Exception:", error);
    throw error;
  }
};

export const getUserProfile = async (userId: string) => {
  console.log("🔐 AuthService: getUserProfile: Fetching profile for", userId);
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error("🔐 AuthService: getUserProfile: Error:", error);
      return { profile: null, error };
    }

    console.log("🔐 AuthService: getUserProfile: Success, profile:", data ? "Found" : "Not found");
    if (data) {
      console.log("🔐 AuthService: getUserProfile: Profile data:", {
        id: data.id,
        username: data.username || 'not set'
      });
    }
    return { profile: data, error: null };
  } catch (error) {
    console.error("🔐 AuthService: getUserProfile: Exception:", error);
    return { profile: null, error };
  }
};
