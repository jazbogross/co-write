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
      
      // Check for both possible auth token keys
      const officialAuthTokenKey = 'sb-uoasmfawwtkejjdglyws-auth-token';
      const legacyAuthTokenKey = 'supabase.auth.token';
      
      const hasOfficialToken = localStorage.getItem(officialAuthTokenKey) !== null;
      const hasLegacyToken = localStorage.getItem(legacyAuthTokenKey) !== null;
      
      console.log('Auth Tokens:', {
        officialToken: hasOfficialToken,
        legacyToken: hasLegacyToken
      });
      
      if (hasLegacyToken && !hasOfficialToken) {
        console.log('Legacy token found but official token missing. This may cause auth issues.');
      }
      
      if (hasOfficialToken && hasLegacyToken) {
        console.log('Both token types found. This may cause conflicts.');
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

/**
 * Clean up duplicate auth tokens in localStorage
 */
export const cleanupDuplicateTokens = () => {
  try {
    // Only run in browser environment
    if (typeof localStorage === 'undefined') return;
    
    const officialAuthTokenKey = 'sb-uoasmfawwtkejjdglyws-auth-token';
    const legacyAuthTokenKey = 'supabase.auth.token';
    
    const hasOfficialToken = localStorage.getItem(officialAuthTokenKey) !== null;
    const hasLegacyToken = localStorage.getItem(legacyAuthTokenKey) !== null;
    
    // If both tokens exist, keep the official one and remove the legacy one
    if (hasOfficialToken && hasLegacyToken) {
      console.log('Cleaning up duplicate auth tokens');
      localStorage.removeItem(legacyAuthTokenKey);
      return true;
    }
    
    // If only legacy token exists, move it to the official key
    if (!hasOfficialToken && hasLegacyToken) {
      console.log('Migrating legacy token to official format');
      const legacyToken = localStorage.getItem(legacyAuthTokenKey);
      localStorage.setItem(officialAuthTokenKey, legacyToken!);
      localStorage.removeItem(legacyAuthTokenKey);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    return false;
  }
};
