
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
  const navigate = useNavigate();
  const { user, loading: authLoading, signOut } = useAuth();
  const [profile, setProfile] = useState<{ email: string; username: string }>({
    email: "",
    username: "",
  });
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    // Only fetch data if authentication is complete and user exists
    if (!authLoading && user && !hasFetched) {
      const getProfile = async () => {
        console.log("Profile: Fetching profile data for user:", user.id);
        try {
          setLoading(true);
          
          // Get user profile data
          const { data, error } = await supabase
            .from('profiles')
            .select('username')
            .eq('id', user.id)
            .single();

          if (error && error.code !== "PGRST116") {
            throw error;
          }

          // If profile exists, set the profile state
          if (data) {
            setProfile({
              email: user.email || "",
              username: data.username || "",
            });
          } else {
            // If profile doesn't exist yet
            setProfile({
              email: user.email || "",
              username: user.email?.split("@")[0] || "",
            });
          }

          // Fetch user scripts - updated to correctly get the admin_id field and match the Script type
          const { data: scriptsData, error: scriptsError } = await supabase
            .from('scripts')
            .select('id, title, created_at, is_private, admin_id')
            .eq('admin_id', user.id);

          if (scriptsError) {
            throw scriptsError;
          }

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
        } catch (error) {
          console.error("Error loading profile:", error);
          toast.error("Failed to load profile");
        } finally {
          setLoading(false);
        }
      };

      getProfile();
    } else if (!authLoading && !user) {
      // Redirect to auth page if not authenticated
      navigate("/auth");
    }
  }, [user, authLoading, navigate, hasFetched]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate("/auth");
    } catch (error) {
      console.error("Error signing out:", error);
      toast.error("Failed to sign out");
    }
  };

  if (authLoading || loading) {
    return <div className="container py-8 text-center">Loading profile...</div>;
  }

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
