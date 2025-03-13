
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ScriptsCard } from "@/components/profile/ScriptsCard";
import { GitHubConnectionCard } from "@/components/profile/GitHubConnectionCard";
import { useAuth } from "@/hooks/useAuth";
import { Script } from "@/types/repository";
import { useUserData } from "@/hooks/useUserData";

export default function Profile() {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  
  console.log(`📋 PROFILE: Component rendering (render #${renderCountRef.current})`);
  
  const navigate = useNavigate();
  const { signOut, user, loading: authLoading, authChecked } = useAuth();
  const { userId, isLoading: userLoading, authProvider, authCheckedOnce } = useUserData();
  
  const [profile, setProfile] = useState<{ email: string; username: string }>({
    email: "",
    username: "",
  });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  console.log("📋 PROFILE: Current states -", {
    renderCount: renderCountRef.current,
    authLoading,
    userLoading,
    userExists: !!userId,
    userId,
    loading,
    hasFetched,
    authProvider,
    authCheckedOnce,
    authChecked,
    redirecting
  });

  // Reset hasFetched when user changes
  useEffect(() => {
    console.log("📋 PROFILE: User or auth check state changed:", {
      userId,
      authCheckedOnce,
      authChecked
    });
    
    if (userId === null && authCheckedOnce && authChecked) {
      console.log("📋 PROFILE: User is null and auth has been checked, resetting hasFetched");
      setHasFetched(false);
      
      // Only redirect if not already redirecting
      if (!redirecting && !authLoading && !userLoading) {
        console.log("📋 PROFILE: No user is authenticated, redirecting to auth page");
        setRedirecting(true);
        navigate("/auth");
      }
    }
  }, [userId, authCheckedOnce, authChecked, navigate, authLoading, userLoading, redirecting]);

  useEffect(() => {
    // Only fetch data if user exists and we haven't fetched data yet and we've checked auth at least once
    if (!userLoading && !authLoading && userId && !hasFetched && authCheckedOnce && authChecked) {
      const getProfile = async () => {
        console.log("📋 PROFILE: Fetching profile data for user:", userId);
        try {
          setLoading(true);
          setFetchError(null);
          
          // Get user data
          const { data: userData, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.error("📋 PROFILE: Error fetching user:", userError);
            setFetchError(`User fetch error: ${userError.message}`);
            throw userError;
          }
          
          const user = userData.user;
          if (!user) {
            console.error("📋 PROFILE: No user data found");
            setFetchError("No user data found");
            throw new Error("No user data found");
          }
          
          // Get user profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('username, github_access_token')
            .eq('id', userId)
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
            setProfile({
              email: user?.email || "",
              username: data.username || "",
            });
          } else {
            console.log("📋 PROFILE: No profile data found, using defaults");
            // If profile doesn't exist yet
            setProfile({
              email: user?.email || "",
              username: user?.email?.split("@")[0] || "",
            });
            
            // Create a profile if one doesn't exist
            try {
              console.log("📋 PROFILE: Creating new profile for user", userId);
              const { error: insertError } = await supabase
                .from('profiles')
                .upsert({ 
                  id: userId, 
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
          const formattedScripts: Script[] = (scriptsData || []).map(script => ({
            id: script.id,
            title: script.title,
            admin_id: script.admin_id,
            created_at: script.created_at,
            is_private: script.is_private,
            profiles: { username: "" } // Add a default profiles property
          }));

          setScripts(formattedScripts);
          setHasFetched(true); // Mark that we've fetched data
          setFetchError(null);
          console.log("📋 PROFILE: Data fetching complete, hasFetched set to true");
        } catch (error) {
          console.error("📋 PROFILE: Error loading profile:", error);
          toast.error("Failed to load profile");
        } finally {
          setLoading(false);
          console.log("📋 PROFILE: Loading state set to false");
        }
      };

      getProfile();
    } else if (!userLoading && !authLoading && !userId && authCheckedOnce && authChecked && !redirecting) {
      // Redirect to auth page if not authenticated and we've checked auth status
      console.log("📋 PROFILE: No authenticated user and auth checked, redirecting to auth page");
      setRedirecting(true);
      navigate("/auth");
    }
  }, [userId, userLoading, authLoading, navigate, hasFetched, authCheckedOnce, authChecked, redirecting]);

  const handleSignOut = async () => {
    try {
      console.log("📋 PROFILE: Signing out");
      await signOut();
      setRedirecting(true);
      navigate("/auth");
    } catch (error) {
      console.error("📋 PROFILE: Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Handle the case where authentication check is still in progress
  if (userLoading || authLoading || !authChecked || !authCheckedOnce) {
    console.log("📋 PROFILE: Rendering loading state - auth state is loading or not checked yet");
    return <div className="container py-8 text-center">Checking authentication...</div>;
  }

  // Handle the case where the user is not authenticated
  if (!userId) {
    console.log("📋 PROFILE: No user ID, should redirect to auth");
    return <div className="container py-8 text-center">Not authenticated. Redirecting...</div>;
  }

  // Handle the case where profile data is loading
  if (loading) {
    console.log("📋 PROFILE: Rendering loading state - profile data is loading");
    return (
      <div className="container py-8 text-center">
        <div>Loading profile...</div>
        {fetchError && (
          <div className="mt-4 p-4 bg-red-50 text-red-800 rounded">
            Debug info: {fetchError}
          </div>
        )}
      </div>
    );
  }

  console.log("📋 PROFILE: Rendering complete profile page");
  return (
    <div className="container max-w-6xl py-8 space-y-6">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <UserProfileCard profileData={profile} />
          <GitHubConnectionCard />
        </div>
        <div>
          <ScriptsCard scripts={scripts} />
        </div>
      </div>
      <div className="flex justify-center mt-8">
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
}
