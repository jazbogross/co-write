
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Script {
  id: string;
  title: string;
  created_at: string;
  admin_id: string;
  is_private?: boolean;
  admin_username?: string;
  profiles?: { username?: string | null } | null;
}

export const useScripts = (userId: string | null) => {
  const [publicScripts, setPublicScripts] = useState<Script[]>([]);
  const [yourScripts, setYourScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchScripts = async () => {
    console.log("🏠 useScripts: Fetching scripts...");
    setIsLoading(true);
    setFetchError(null);
    
    try {
      // 1. Fetch public scripts
      console.log("🏠 useScripts: Querying for public scripts (is_private=false)");
      const { data: publicData, error: publicError } = await supabase
        .from('scripts')
        .select(`
          id,
          title,
          created_at,
          admin_id,
          is_private,
          profiles:admin_id(username)
        `)
        .eq('is_private', false);
  
      if (publicError) {
        console.error("🏠 useScripts: Error fetching public scripts:", publicError);
        setFetchError(`Public scripts fetch error: ${publicError.message}`);
        toast.error("Failed to load public scripts");
        return;
      }
  
      console.log("🏠 useScripts: Public scripts raw data:", publicData);
      
      if (!publicData || publicData.length === 0) {
        console.log("🏠 useScripts: No public scripts found in the database");
        setPublicScripts([]);
      } else {
        // Format scripts with admin usernames directly from the profiles join
        const formattedPublicScripts = publicData.map(script => ({
          id: script.id,
          title: script.title,
          created_at: script.created_at,
          admin_id: script.admin_id,
          is_private: script.is_private ?? false,
          admin_username: script.profiles?.username || 'Unknown',
          profiles: script.profiles
        }));
        
        console.log("🏠 useScripts: Formatted public scripts:", formattedPublicScripts);
        setPublicScripts(formattedPublicScripts);
      }
  
      // 3. Fetch user's scripts if user is logged in
      if (userId) {
        console.log("🏠 useScripts: Fetching scripts for user:", userId);
        const { data: userScriptsData, error: userScriptsError } = await supabase
          .from('scripts')
          .select(`
            id,
            title,
            created_at,
            admin_id,
            is_private
          `)
          .eq('admin_id', userId);
  
        if (userScriptsError) {
          console.error("🏠 useScripts: Error fetching user scripts:", userScriptsError);
          setFetchError(`User scripts fetch error: ${userScriptsError.message}`);
          toast.error("Failed to load your scripts");
        } else {
          console.log("🏠 useScripts: User scripts data:", userScriptsData);
          
          const userFormattedScripts = userScriptsData.map(script => ({
            id: script.id,
            title: script.title,
            created_at: script.created_at,
            admin_id: script.admin_id,
            is_private: script.is_private ?? false,
            admin_username: 'You'
          }));
          
          setYourScripts(userFormattedScripts);
          console.log("🏠 useScripts: Formatted user scripts:", userFormattedScripts);
        }
      }
    } catch (error) {
      console.error('🏠 useScripts: Error fetching scripts:', error);
      setFetchError(`Failed to fetch scripts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error("Failed to load scripts");
    } finally {
      setIsLoading(false);
      console.log("🏠 useScripts: Loading state set to false");
    }
  };

  useEffect(() => {
    if (userId !== undefined) {
      console.log("🏠 useScripts: Auth status known, fetching scripts");
      fetchScripts();
    }
  }, [userId]);

  return {
    publicScripts,
    yourScripts,
    isLoading,
    fetchError,
    fetchScripts
  };
};
