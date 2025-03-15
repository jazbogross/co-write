
import { useState, useRef } from 'react';
import type { AuthUser } from '@/services/authService';

export const useAuthState = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  // References for cleanup and component mount status
  const isMounted = useRef(true);
  const authListenerCleanup = useRef<(() => void) | null>(null);
  
  console.log("🔑 useAuthState: Current state:", { 
    user: user ? { id: user.id } : null, 
    loading, 
    authChecked 
  });
  
  return {
    state: { user, loading, authChecked },
    setters: { setUser, setLoading, setAuthChecked },
    refs: { isMounted, authListenerCleanup }
  };
};
