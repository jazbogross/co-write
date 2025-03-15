
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

export default function Profile() {
  console.log("📋 PROFILE: Component rendering");
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut, authChecked } = useAuth();
  const isMounted = useRef(true);
  
  const [profile, setProfile] = useState<{ email: string; username: string }>({
    email: "",
    username: "",
  });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  console.log("📋 PROFILE: Current states -", {
    authLoading,
    userExists: !!user,
    userId: user?.id,
    loading,
    hasFetched,
    authChecked,
    fetchError: !!fetchError
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("📋 PROFILE: Component unmounting");
      isMounted.current = false;
    };
  }, []);

  // Reset fetch state when user changes
  useEffect(() => {
    if (!user && authChecked) {
      console.log("📋 PROFILE: User is null and auth has been checked, resetting hasFetched");
      if (isMounted.current) {
        setHasFetched(false);
      }
    }
  }, [user, authChecked]);

  // Fetch user data when authenticated
  useEffect(() => {
    // Only fetch data if user exists, we haven't fetched yet, and auth is checked
    if (!authLoading && user?.id && !hasFetched && authChecked) {
      const getProfile = async () => {
        console.log("📋 PROFILE: Fetching profile data for user:", user.id);
        try {
          if (!isMounted.current) {
            console.log("📋 PROFILE: Component unmounted during fetch start, aborting");
            return;
          }
          
          setLoading(true);
          setFetchError(null);
          
          // Set basic profile data from auth user
          if (isMounted.current) {
            setProfile({
              email: user.email || "",
              username: user.username || "",
            });
          }

          // Fetch user scripts
          console.log("📋 PROFILE: Fetching scripts for user:", user.id);
          const { data: scriptsData, error: scriptsError } = await supabase
            .from('scripts')
            .select('id, title, created_at, is_private, admin_id')
            .eq('admin_id', user.id);

          if (!isMounted.current) {
            console.log("📋 PROFILE: Component unmounted during fetch, aborting");
            return;
          }

          if (scriptsError) {
            console.error("📋 PROFILE: Error fetching scripts:", scriptsError);
            setFetchError(`Scripts fetch error: ${scriptsError.message}`);
            // Don't throw here, continue with partial data if possible
          } else {
            console.log("📋 PROFILE: Scripts data fetched successfully:", scriptsData?.length || 0, "scripts");

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
            console.log("📋 PROFILE: Data fetching complete, hasFetched set to true");
          }
        } catch (error) {
          console.error("📋 PROFILE: Error loading profile:", error);
          if (isMounted.current) {
            setFetchError(error instanceof Error ? error.message : String(error));
            toast.error("Failed to load profile");
          }
        } finally {
          if (isMounted.current) {
            setLoading(false);
            console.log("📋 PROFILE: Loading state set to false");
          }
        }
      };

      getProfile();
    } else if (!authLoading && !user && authChecked) {
      // Redirect to auth page if not authenticated and we've checked auth status
      console.log("📋 PROFILE: No authenticated user and auth checked, redirecting to auth page");
      navigate("/auth");
    }
  }, [user, authLoading, navigate, hasFetched, authChecked]);

  const handleSignOut = async () => {
    try {
      console.log("📋 PROFILE: Signing out");
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("📋 PROFILE: Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  // Handle the case where authentication check is still in progress
  if (authLoading || !authChecked) {
    console.log("📋 PROFILE: Rendering loading state - auth state is loading or not checked yet");
    return <div className="container py-8 text-center">
      <div className="text-lg">Checking authentication...</div>
      <div className="text-sm text-gray-500 mt-2">Please wait while we verify your session</div>
    </div>;
  }

  // Handle the case where the user is not authenticated
  if (!user) {
    console.log("📋 PROFILE: No user, redirecting to auth");
    return <div className="container py-8 text-center">
      <div className="text-lg">Not authenticated. Redirecting...</div>
    </div>;
  }

  // Handle the case where profile data is loading
  if (loading) {
    console.log("📋 PROFILE: Rendering loading state - profile data is loading");
    return (
      <div className="container py-8 text-center">
        <div className="text-lg">Loading profile...</div>
        <div className="text-sm text-gray-500 mt-2">Fetching your data and scripts</div>
        {fetchError && (
          <div className="mt-4 p-4 bg-red-50 text-red-800 rounded">
            <div className="font-semibold">Error loading data:</div>
            <div>{fetchError}</div>
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
