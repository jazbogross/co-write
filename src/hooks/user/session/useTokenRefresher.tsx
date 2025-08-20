
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface TokenRefreshResult {
  success: boolean;
  session: Session | null;
  error: Error | null;
}

/**
 * Refreshes the authentication token
 */
export const useTokenRefresher = () => {
  const refreshToken = async (): Promise<TokenRefreshResult> => {
    console.log('👤 useTokenRefresher: Refreshing token...');
    
    try {
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('👤 useTokenRefresher: Failed to refresh token:', error);
        return { success: false, session: null, error };
      }
      
      if (!data.session) {
        console.log('👤 useTokenRefresher: No session returned after refresh');
        toast.error("Your session has expired. Please sign in again.");
        return { success: false, session: null, error: new Error('No session after refresh') };
      }
      
      console.log('👤 useTokenRefresher: Token refreshed successfully');
      return { success: true, session: data.session, error: null };
    } catch (error) {
      console.error('👤 useTokenRefresher: Exception during token refresh:', error);
      return { 
        success: false, 
        session: null, 
        error: error instanceof Error ? error : new Error('Unknown error during token refresh') 
      };
    }
  };
  
  return { refreshToken };
};
