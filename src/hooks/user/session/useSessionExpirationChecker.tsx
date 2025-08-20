
import { Session } from '@supabase/supabase-js';

/**
 * Checks if a session is about to expire within the given threshold
 */
export const isSessionExpiring = (session: Session, thresholdInSeconds: number = 300): boolean => {
  if (!session.expires_at) return false;
  
  const expiresAt = session.expires_at;
  const nowInSeconds = Math.floor(Date.now() / 1000);
  
  return expiresAt - nowInSeconds < thresholdInSeconds;
};
