
import { useEffect, useState } from "react";
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
  const { user, loading: authLoading, signOut } = useAuth();
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
    hasFetched
  });

  useEffect(() => {
    // Only fetch data if authentication is complete and user exists
    if (!authLoading && user && !hasFetched) {
      const getProfile = async () => {
        console.log("📋 PROFILE: Fetching profile data for user:", user.id);
        try {
          setLoading(true);
          
          // Get user profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("📋 PROFILE: Error fetching profile:", error);
            setFetchError(`Profile fetch error: ${error.message}`);
            if (error.code !== "PGRST116") {
              throw error;
            }
          }

          // If profile exists, set the profile state
          if (data) {
            console.log("📋 PROFILE: Profile data found:", data);
            setProfile({
              email: user.email || "",
              username: data.username || "",
            });
          } else {
            console.log("📋 PROFILE: No profile data found, using defaults");
            // If profile doesn't exist yet
            setProfile({
              email: user.email || "",
              username: user.email?.split("@")[0] || "",
            });
          }

          // Fetch user scripts
          console.log("📋 PROFILE: Fetching scripts for user:", user.id);
          const { data: scriptsData, error: scriptsError } = await supabase
            .from('scripts')
            .select('id, title, created_at, is_private, admin_id')
            .eq('admin_id', user.id);

          if (scriptsError) {
            console.error("📋 PROFILE: Error fetching scripts:", scriptsError);
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
    } else if (!authLoading && !user) {
      // Redirect to auth page if not authenticated
      console.log("📋 PROFILE: No authenticated user, redirecting to auth page");
      navigate("/auth");
    }
  }, [user, authLoading, navigate, hasFetched]);

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

  // Add more detailed rendering logs
  if (authLoading) {
    console.log("📋 PROFILE: Rendering loading state - auth is loading");
    return <div className="container py-8 text-center">Loading authentication...</div>;
  }

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
