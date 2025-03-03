
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useUserData = () => {
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    console.log('👤 useUserData: Fetching user...');
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 useUserData: User fetched:', user?.id);
        setUserId(user?.id || null);
      } catch (error) {
        console.error('👤 useUserData: Error fetching user:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUser();
  }, []);

  return { userId, isLoading };
};
