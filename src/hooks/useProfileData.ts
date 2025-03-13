
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Script } from "@/types/repository";

interface ProfileData {
  email: string;
  username: string;
}

export function useProfileData() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  
  const [profile, setProfile] = useState<ProfileData>({
    email: "",
    username: "",
  });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch user data when authenticated
  useEffect(() => {
    let isMounted = true;
    
    if (!authLoading && isAuthenticated && user?.id && !hasFetched) {
      const getProfile = async () => {
        console.log("📋 PROFILE: Fetching profile data for user:", user.id);
        try {
          setLoading(true);
          setFetchError(null);
          
          // Get user profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('username, github_access_token')
            .eq('id', user.id)
            .maybeSingle();

          if (error && error.code !== 'PGRST116') {
            console.error("📋 PROFILE: Error fetching profile:", error);
            console.log("📋 PROFILE: Error details:", JSON.stringify(error));
            setFetchError(`Profile fetch error: ${error.message}`);
            throw error;
          }

          // If profile exists, set the profile state
          if (data) {
            console.log("📋 PROFILE: Profile data found:", data);
            if (isMounted) {
              setProfile({
                email: user?.email || "",
                username: data.username || "",
              });
            }
          } else {
            console.log("📋 PROFILE: No profile data found, using defaults");
            // If profile doesn't exist yet
            if (isMounted) {
              setProfile({
                email: user?.email || "",
                username: user?.email?.split("@")[0] || "",
              });
            }
            
            // Create a profile if one doesn't exist
            try {
              console.log("📋 PROFILE: Creating new profile for user", user.id);
              const { error: insertError } = await supabase
                .from('profiles')
                .upsert({ 
                  id: user.id, 
                  username: user?.email?.split("@")[0] || "",
                  updated_at: new Date().toISOString() 
                });
                
              if (insertError) {
                console.error("📋 PROFILE: Error creating profile:", insertError);
                console.log("📋 PROFILE: Error details:", JSON.stringify(insertError));
              } else {
                console.log("📋 PROFILE: Created new profile for user");
              }
            } catch (insertError) {
              console.error("📋 PROFILE: Exception creating profile:", insertError);
            }
          }

          // Fetch user scripts
          console.log("📋 PROFILE: Fetching scripts for user:", user.id);
          const { data: scriptsData, error: scriptsError } = await supabase
            .from('scripts')
            .select('id, title, created_at, is_private, admin_id')
            .eq('admin_id', user.id);

          if (scriptsError) {
            console.error("📋 PROFILE: Error fetching scripts:", scriptsError);
            console.log("📋 PROFILE: Error details:", JSON.stringify(scriptsError));
            setFetchError(`Scripts fetch error: ${scriptsError.message}`);
            throw scriptsError;
          }

          console.log("📋 PROFILE: Scripts data:", scriptsData);

          // Transform the data to match the Script type
          const formattedScripts: Script[] = (scriptsData || []).map(script => ({
            id: script.id,
            title: script.title,
            admin_id: script.admin_id,
            created_at: script.created_at,
            is_private: script.is_private,
            profiles: { username: "" } // Add a default profiles property
          }));

          if (isMounted) {
            setScripts(formattedScripts);
            setHasFetched(true); // Mark that we've fetched data
            setFetchError(null);
            setLoading(false); // Important: Set loading to false here
            console.log("📋 PROFILE: Data fetching complete, hasFetched set to true");
          }
        } catch (error) {
          console.error("📋 PROFILE: Error loading profile:", error);
          if (isMounted) {
            toast.error("Failed to load profile");
            setLoading(false); // Make sure to set loading to false even on error
          }
        }
      };

      getProfile();
    } else if (!authLoading && isAuthenticated && user?.id && hasFetched) {
      // If we've already fetched data, make sure loading is false
      setLoading(false);
    }
    
    return () => {
      isMounted = false;
    };
  }, [user, authLoading, hasFetched, isAuthenticated]);

  return {
    profile,
    scripts,
    loading,
    fetchError
  };
}
