
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
 * Clean up all legacy auth tokens in localStorage
 */
export const cleanupLegacyTokens = () => {
  try {
    // Only run in browser environment
    if (typeof localStorage === 'undefined') return;
    
    // Find and remove legacy tokens by looking for Supabase auth token patterns
    const legacyPatterns = [
      /^sb-.*-auth-token$/,
      /^supabase\.auth\.token$/
    ];
    
    let tokensRemoved = false;
    
    // Loop through all localStorage items
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      
      // Check if key matches legacy patterns but ignore current session
      const isLegacyToken = legacyPatterns.some(pattern => pattern.test(key));
      
      if (isLegacyToken) {
        // Don't log the actual token for security
        console.log(`Found legacy token: ${key}`);
        
        // Check if token is not the current one
        try {
          const token = JSON.parse(localStorage.getItem(key) || '{}');
          if (token && typeof token === 'object') {
            console.log('Removing legacy token');
            localStorage.removeItem(key);
            tokensRemoved = true;
          }
        } catch (e) {
          // Not a valid JSON token, remove it anyway
          localStorage.removeItem(key);
          tokensRemoved = true;
        }
      }
    }
    
    return tokensRemoved;
  } catch (error) {
    console.error('Error cleaning up legacy tokens:', error);
    return false;
  }
};
