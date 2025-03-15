
import { supabase } from '@/integrations/supabase/client';

/**
 * Debug utility to help diagnose session persistence issues
 * This can be called from any component when troubleshooting auth issues
 */
export const debugSessionState = async () => {
  try {
    console.log('========== SESSION DEBUG ==========');
    
    // Check local storage
    const hasLocalStorage = typeof localStorage !== 'undefined';
    console.log('Local Storage Available:', hasLocalStorage);
    
    if (hasLocalStorage) {
      const keys = Object.keys(localStorage);
      console.log('All Local Storage Keys:', keys);
      
      const authTokenKey = 'supabase.auth.token';
      const hasAuthToken = localStorage.getItem(authTokenKey) !== null;
      console.log('Auth Token Exists:', hasAuthToken);
      
      if (hasAuthToken) {
        const token = localStorage.getItem(authTokenKey);
        console.log('Token Preview:', token ? `${token.substring(0, 20)}...` : 'null');
      }
    }
    
    // Check current session from Supabase
    const { data, error } = await supabase.auth.getSession();
    console.log('Current Session:', {
      exists: !!data.session,
      error: error ? error.message : null,
      userId: data.session?.user?.id || 'none'
    });
    
    if (data.session) {
      console.log('Session Details:', {
        expires_at: data.session.expires_at,
        provider: data.session.user?.app_metadata?.provider || 'unknown'
      });
    }
    
    console.log('================================');
    return { hasSession: !!data.session };
  } catch (error) {
    console.error('Session Debug Error:', error);
    return { hasSession: false, error };
  }
};

/**
 * Force refresh the current session token
 */
export const refreshSessionToken = async () => {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    console.log('Session Refresh Result:', {
      success: !!data.session,
      error: error ? error.message : null
    });
    return { success: !!data.session, error };
  } catch (error) {
    console.error('Session Refresh Error:', error);
    return { success: false, error };
  }
};
