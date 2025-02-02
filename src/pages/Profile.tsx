import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { GitHubConnectionCard } from "@/components/profile/GitHubConnectionCard";
import { ScriptsCard } from "@/components/profile/ScriptsCard";
import { RepositoryManagementCard } from "@/components/profile/RepositoryManagementCard";

type Script = {
  id: string;
  title: string;
  created_at: string;
  is_private: boolean;
};

export default function Profile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{ email: string; username: string } | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [isGithubConnected, setIsGithubConnected] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      const provider = session?.user?.app_metadata?.provider;
      setIsGithubConnected(provider === 'github');

      const { data: profile } = await supabase
        .from("profiles")
        .select("email, username")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfileData(profile);
      }
      
      const { data: userScripts } = await supabase
        .from("scripts")
        .select("id, title, created_at, is_private")
        .eq("admin_id", user.id)
        .order("created_at", { ascending: false });

      if (userScripts) {
        setScripts(userScripts);
      }
      
      setLoading(false);
    }

    loadProfile();
  }, [navigate]);

  if (loading || !profileData) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="container max-w-2xl py-10">
      <UserProfileCard profileData={profileData} />
      {!isGithubConnected && <GitHubConnectionCard />}
      {isGithubConnected && <RepositoryManagementCard />}
      <ScriptsCard scripts={scripts} />
    </div>
  );
}