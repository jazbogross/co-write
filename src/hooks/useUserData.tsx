
import { useAuth } from '@/hooks/useAuth';

export const useUserData = () => {
  const { user, isAuthenticated } = useAuth();
  
  return {
    userId: user?.id || null,
    authProvider: user?.provider || null,
    isAuthenticated
  };
};
