
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Script } from "@/types/repository";
import { useAuth } from "@/hooks/useAuth";

interface ProfileDataLoaderProps {
  children: (data: {
    profile: { email: string; username: string };
    scripts: Script[];
    loading: boolean;
    fetchError: string | null;
  }) => React.ReactNode;
}

export function ProfileDataLoader({ children }: ProfileDataLoaderProps) {
  console.log("📋 PROFILE-DATA: Component initializing");
  const { user } = useAuth();
  const isMounted = useRef(true);
  
  const [profile, setProfile] = useState<{ email: string; username: string }>({
    email: "",
    username: "",
  });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("📋 PROFILE-DATA: Component unmounting");
      isMounted.current = false;
    };
  }, []);

  // Reset fetch state when user changes
  useEffect(() => {
    if (!user) {
      console.log("📋 PROFILE-DATA: User is null, resetting hasFetched");
      if (isMounted.current) {
        setHasFetched(false);
      }
    } else if (user && !hasFetched) {
      // Trigger fetch when user becomes available
      fetchProfileData();
    }
  }, [user]);

  // Function to fetch profile data
  const fetchProfileData = async () => {
    if (!user?.id || !isMounted.current) return;
    
    console.log("📋 PROFILE-DATA: Fetching profile data for user:", user.id);
    try {
      setLoading(true);
      setFetchError(null);
      
      // Set basic profile data from auth user
      if (isMounted.current && user.email) {
        setProfile({
          email: user.email || "",
          username: user.username || "",
        });
      }

      // Fetch user scripts
      console.log("📋 PROFILE-DATA: Fetching scripts for user:", user.id);
      const { data: scriptsData, error: scriptsError } = await supabase
        .from('scripts')
        .select('id, title, created_at, is_private, admin_id')
        .eq('admin_id', user.id);

      if (!isMounted.current) {
        console.log("📋 PROFILE-DATA: Component unmounted during fetch, aborting");
        return;
      }

      if (scriptsError) {
        console.error("📋 PROFILE-DATA: Error fetching scripts:", scriptsError);
        setFetchError(`Scripts fetch error: ${scriptsError.message}`);
      } else {
        console.log("📋 PROFILE-DATA: Scripts data fetched successfully:", scriptsData?.length || 0, "scripts");

        // Transform the data to match the Script type
        const formattedScripts: Script[] = (scriptsData || []).map(script => ({
          id: script.id,
          title: script.title,
          admin_id: script.admin_id,
          created_at: script.created_at,
          is_private: script.is_private,
          profiles: { username: "" } // Add a default profiles property
        }));

        if (isMounted.current) {
          setScripts(formattedScripts);
        }
      }
      
      if (isMounted.current) {
        setHasFetched(true); // Mark that we've fetched data
        setFetchError(null);
        console.log("📋 PROFILE-DATA: Data fetching complete, hasFetched set to true");
      }
    } catch (error) {
      console.error("📋 PROFILE-DATA: Error loading profile:", error);
      if (isMounted.current) {
        setFetchError(error instanceof Error ? error.message : String(error));
        toast.error("Failed to load profile");
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
        console.log("📋 PROFILE-DATA: Loading state set to false");
      }
    }
  };

  return (
    <>
      {children({
        profile,
        scripts,
        loading,
        fetchError
      })}
    </>
  );
}
