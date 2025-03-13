
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserData = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('👤 useUserData: Fetching user...');
    const fetchUser = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('👤 useUserData: Error fetching user:', userError);
          setError(userError.message);
          setUserId(null);
        } else {
          console.log('👤 useUserData: User fetched:', user?.id);
          setUserId(user?.id || null);
        }
      } catch (error) {
        console.error('👤 useUserData: Error fetching user:', error);
        setError(error instanceof Error ? error.message : 'Unknown error');
        setUserId(null);
      } finally {
        setIsLoading(false);
        console.log('👤 useUserData: Loading state set to false');
      }
    };
    
    fetchUser();
    
    // Set up auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('👤 useUserData: Auth state change event:', event);
      
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('👤 useUserData: User signed in:', session.user.id);
        setUserId(session.user.id);
        setIsLoading(false);
      } else if (event === 'SIGNED_OUT') {
        console.log('👤 useUserData: User signed out');
        setUserId(null);
        setIsLoading(false);
      }
    });
    
    return () => {
      authListener.subscription.unsubscribe();
      console.log('👤 useUserData: Cleanup - unsubscribed from auth listener');
    };
  }, []);

  return { userId, isLoading, error };
};
