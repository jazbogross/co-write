
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Script } from "@/types/repository";

interface ProfileData {
  email: string;
  username: string;
}

/**
 * Custom hook to fetch and manage user profile data
 */
export function useProfileData() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const userIdRef = useRef<string | null>(null);
  
  const [profile, setProfile] = useState<ProfileData>({
    email: "",
    username: "",
  });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Reset fetched state if user changes or logs out
  useEffect(() => {
    // If user ID changed or auth state changed, reset the hasFetched state
    if (user?.id !== userIdRef.current || !isAuthenticated) {
      console.log("📋 PROFILE: User changed or auth state changed, resetting fetch state", {
        previousUserId: userIdRef.current,
        currentUserId: user?.id,
        isAuthenticated
      });
      userIdRef.current = user?.id || null;
      setHasFetched(false);
    }
  }, [user?.id, isAuthenticated]);

  // Fetch user data when authenticated
  useEffect(() => {
    console.log("📋 PROFILE: useProfileData effect triggered", { 
      authLoading, 
      isAuthenticated, 
      userId: user?.id, 
      hasFetched 
    });

    let isMounted = true;
    
    const fetchData = async () => {
      // Skip fetch if auth is still loading
      if (authLoading) {
        console.log("📋 PROFILE: Auth still loading, skipping fetch");
        return;
      }
      
      // Clear data if not authenticated
      if (!isAuthenticated || !user?.id) {
        console.log("📋 PROFILE: Not authenticated, clearing profile data");
        if (isMounted) {
          setLoading(false);
          setHasFetched(false);
        }
        return;
      }
      
      // If we've already fetched data for this user, don't fetch again
      if (hasFetched && userIdRef.current === user.id) {
        console.log("📋 PROFILE: Data already fetched for this user, skipping");
        setLoading(false);
        return;
      }
      
      console.log("📋 PROFILE: Fetching profile data for user:", user.id);
      
      try {
        setLoading(true);
        setFetchError(null);
        
        // Get user profile data
        const profileData = await fetchProfileData(user.id);
        
        // If profile exists, set the profile state
        if (profileData) {
          handleProfileData(profileData, user.id, isMounted);
        } else {
          handleMissingProfile(user.id, isMounted);
        }

        // Fetch user scripts
        const scriptsData = await fetchUserScripts(user.id);
        
        if (isMounted) {
          setScripts(scriptsData);
          setHasFetched(true);
          setFetchError(null);
          setLoading(false);
          console.log("📋 PROFILE: Data fetching complete, hasFetched set to true");
        }
      } catch (error) {
        handleFetchError(error, isMounted);
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, authLoading, isAuthenticated, hasFetched]);

  /**
   * Fetches profile data from Supabase
   */
  const fetchProfileData = async (userId: string) => {
    try {
      console.log("📋 PROFILE: Fetching profile data for user ID:", userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('username, email, github_access_token')
        .eq('id', userId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("📋 PROFILE: Error fetching profile:", error);
        console.log("📋 PROFILE: Error details:", JSON.stringify(error));
        setFetchError(`Profile fetch error: ${error.message}`);
        throw error;
      }

      return data;
    } catch (error) {
      console.error("📋 PROFILE: Error in fetchProfileData:", error);
      // Don't rethrow - allow the process to continue
      return null;
    }
  };

  /**
   * Handles existing profile data
   */
  const handleProfileData = (data: any, userId: string, isMounted: boolean) => {
    console.log("📋 PROFILE: Profile data found:", data);
    if (isMounted) {
      setProfile({
        email: data.email || user?.email || "",
        username: data.username || "",
      });
    }
  };

  /**
   * Handles the case where no profile exists yet
   */
  const handleMissingProfile = async (userId: string, isMounted: boolean) => {
    console.log("📋 PROFILE: No profile data found, using defaults and creating profile");
    // If profile doesn't exist yet
    if (isMounted) {
      setProfile({
        email: user?.email || "",
        username: user?.email?.split("@")[0] || "",
      });
    }
    
    // Create a profile if one doesn't exist
    try {
      await createNewProfile(userId);
    } catch (error) {
      console.error("📋 PROFILE: Error creating profile:", error);
      // Don't let this stop the flow
    }
  };

  /**
   * Creates a new profile in Supabase
   */
  const createNewProfile = async (userId: string) => {
    try {
      if (!isAuthenticated) {
        console.log("📋 PROFILE: Cannot create profile - user not authenticated");
        return;
      }

      console.log("📋 PROFILE: Creating new profile for user", userId);
      const { error: insertError } = await supabase
        .from('profiles')
        .upsert({ 
          id: userId, 
          username: user?.email?.split("@")[0] || "",
          email: user?.email || "",
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
  };

  /**
   * Fetches user scripts from Supabase
   */
  const fetchUserScripts = async (userId: string) => {
    try {
      console.log("📋 PROFILE: Fetching scripts for user:", userId);
      const { data: scriptsData, error: scriptsError } = await supabase
        .from('scripts')
        .select('id, title, created_at, is_private, admin_id')
        .eq('admin_id', userId);

      if (scriptsError) {
        console.error("📋 PROFILE: Error fetching scripts:", scriptsError);
        console.log("📋 PROFILE: Error details:", JSON.stringify(scriptsError));
        setFetchError(`Scripts fetch error: ${scriptsError.message}`);
        throw scriptsError;
      }

      console.log("📋 PROFILE: Scripts data:", scriptsData);

      // Transform the data to match the Script type
      return (scriptsData || []).map(script => ({
        id: script.id,
        title: script.title,
        admin_id: script.admin_id,
        created_at: script.created_at,
        is_private: script.is_private,
        profiles: { username: "" } // Add a default profiles property
      }));
    } catch (error) {
      console.error("📋 PROFILE: Error in fetchUserScripts:", error);
      // Return empty array to avoid breaking the UI
      return [];
    }
  };

  /**
   * Handles errors during data fetching
   */
  const handleFetchError = (error: any, isMounted: boolean) => {
    console.error("📋 PROFILE: Error loading profile:", error);
    if (isMounted) {
      setFetchError(error.message || "Failed to load profile");
      toast.error("Failed to load profile");
      setLoading(false); // Make sure to set loading to false even on error
      setHasFetched(true); // Mark as fetched to prevent continuous retry loops
    }
  };

  return {
    profile,
    scripts,
    loading,
    fetchError
  };
}
