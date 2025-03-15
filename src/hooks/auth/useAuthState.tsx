
import { useState, useRef } from 'react';
import type { AuthUser } from '@/services/authService';

export type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  authChecked: boolean;
};

export const useAuthState = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const isMounted = useRef(true);
  const authListenerCleanup = useRef<(() => void) | null>(null);

  return {
    state: {
      user,
      loading,
      authChecked,
    },
    setters: {
      setUser,
      setLoading,
      setAuthChecked,
    },
    refs: {
      isMounted,
      authListenerCleanup,
    }
  };
};
