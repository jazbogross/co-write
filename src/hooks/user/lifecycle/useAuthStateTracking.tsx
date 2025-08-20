
import { useEffect } from 'react';

/**
 * Hook to track and log auth state changes
 * @param state Current auth state object
 */
export const useAuthStateTracking = (state: {
  userId: string | null;
  isLoading: boolean;
  error: string | null;
  authProvider: string | null;
  authCheckedOnce: boolean;
}) => {
  // Log state updates for debugging
  useEffect(() => {
    console.log('👤 useAuthStateTracking: State updated:', {
      userId: state.userId,
      isLoading: state.isLoading,
      error: state.error,
      authProvider: state.authProvider,
      authCheckedOnce: state.authCheckedOnce
    });
  }, [state.userId, state.isLoading, state.error, state.authProvider, state.authCheckedOnce]);
};
