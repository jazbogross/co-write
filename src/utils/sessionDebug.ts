
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
      
      // Check for all possible auth token keys
      const possibleAuthTokenKeys = [
        'sb-uoasmfawwtkejjdglyws-auth-token',  // Current correct key
        'sb-rvcjjrthsktrkrdcujna-auth-token',  // Old project key
        'supabase.auth.token'                   // Legacy key
      ];
      
      const tokenStatuses = {};
      possibleAuthTokenKeys.forEach(key => {
        tokenStatuses[key] = localStorage.getItem(key) !== null;
      });
      
      console.log('Auth Tokens Status:', tokenStatuses);
      
      // Detailed logging for conflicts
      const correctKey = 'sb-uoasmfawwtkejjdglyws-auth-token';
      const hasIncorrectTokens = Object.entries(tokenStatuses)
        .some(([key, exists]) => key !== correctKey && exists);
      
      if (hasIncorrectTokens) {
        console.log('WARNING: Incorrect tokens found. This may cause auth issues.');
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
    
    const correctTokenKey = 'sb-uoasmfawwtkejjdglyws-auth-token';
    const oldTokenKeys = [
      'sb-rvcjjrthsktrkrdcujna-auth-token',
      'supabase.auth.token'
    ];
    
    // Remove any old tokens
    let tokensRemoved = false;
    oldTokenKeys.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`Cleaning up old auth token: ${key}`);
        localStorage.removeItem(key);
        tokensRemoved = true;
      }
    });
    
    return tokensRemoved;
  } catch (error) {
    console.error('Error cleaning up tokens:', error);
    return false;
  }
};
