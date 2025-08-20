
import { useEffect } from 'react';

/**
 * Hook to handle auth cleanup on component unmount
 * @param isMounted Reference to track if the component is mounted
 * @param authListenerCleanup Reference to the auth listener cleanup function
 */
export const useAuthCleanup = (
  isMounted: React.MutableRefObject<boolean>,
  authListenerCleanup: React.MutableRefObject<(() => void) | null>
) => {
  useEffect(() => {
    return () => {
      console.log("👤 useAuthCleanup: Component unmounting, cleaning up");
      isMounted.current = false;
      
      // Clean up auth listener if it exists
      if (authListenerCleanup.current) {
        console.log("👤 useAuthCleanup: Cleaning up auth listener on unmount");
        authListenerCleanup.current();
        authListenerCleanup.current = null;
      }
    };
  }, []);
};
