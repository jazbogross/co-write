
import { AuthUser } from '@/services/authService';

export interface UseAuthListenerResult {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export interface SessionData {
  user: {
    id: string;
    email?: string | null;
    app_metadata?: {
      provider?: string;
    };
  };
}

export interface AuthEventData {
  event: string;
  session: SessionData | null;
}
