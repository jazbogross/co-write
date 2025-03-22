
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
}

export const useScripts = (userId: string | null) => {
  const [publicScripts, setPublicScripts] = useState<Script[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchScripts = async () => {
    console.log("🏠 useScripts: Fetching scripts...");
    setIsLoading(true);
    setFetchError(null);
    
    try {
      // Fetch public scripts
      console.log("🏠 useScripts: Querying for public scripts (is_private=false)");
      const { data: publicData, error: publicError } = await supabase
        .from('scripts')
        .select(`
          id,
          title,
          created_at,
          admin_id,
          is_private
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
        // Get unique admin_ids to fetch username data
        const adminIds = [...new Set(publicData.map(script => script.admin_id))];
        console.log("🏠 useScripts: Fetching usernames for admin IDs:", adminIds);
        
        try {
          // Fetch profile data for these admin IDs
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username')
            .in('id', adminIds);
            
          if (profilesError) {
            console.error("🏠 useScripts: Error fetching profiles:", profilesError);
          }
          
          // Create a map of admin_id -> username for easier lookup
          const adminUsernames: Record<string, string> = {};
          if (profilesData) {
            profilesData.forEach(profile => {
              adminUsernames[profile.id] = profile.username || 'Unknown';
            });
          }
          
          // Format scripts with admin usernames
          const formattedPublicScripts: Script[] = publicData.map(script => {
            return {
              id: script.id,
              title: script.title,
              created_at: script.created_at,
              admin_id: script.admin_id,
              is_private: script.is_private ?? false,
              admin_username: adminUsernames[script.admin_id] || 'Unknown'
            };
          });
          
          console.log("🏠 useScripts: Formatted public scripts:", formattedPublicScripts);
          setPublicScripts(formattedPublicScripts);
        } catch (profilesException) {
          console.error("🏠 useScripts: Exception fetching profiles:", profilesException);
          // Still set scripts even if profile fetch fails, just without usernames
          const formattedPublicScripts: Script[] = publicData.map(script => {
            return {
              id: script.id,
              title: script.title,
              created_at: script.created_at,
              admin_id: script.admin_id,
              is_private: script.is_private ?? false,
              admin_username: 'Unknown'
            };
          });
          setPublicScripts(formattedPublicScripts);
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

  // Initial data fetch
  useEffect(() => {
    console.log("SCRIPTS: Initial fetch with userId:", userId);
    
    // Only fetch if we have a definite value for userId (either a string or null)
    if (userId !== undefined) {
      fetchScripts();
    }
  }, [userId]);

  return {
    publicScripts,
    isLoading,
    fetchError,
    fetchScripts
  };
};
