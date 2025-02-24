
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserProfileCard } from "@/components/profile/UserProfileCard";
import { ScriptsCard } from "@/components/profile/ScriptsCard";
import { GitHubConnectionChecker } from "@/components/profile/GitHubConnectionChecker";

type Script = {
  id: string;
  title: string;
  created_at: string;
  is_private: boolean;
};

export default function Profile() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState<{ email: string; username: string } | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);

  // This effect runs once when the component mounts.
  // It checks for GitHub installation parameters in the URL and stores the installation ID.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const installationId = params.get("installation_id");

    if (installationId) {
      localStorage.setItem("github_app_installation_id", installationId);
      toast({
        title: "Success",
        description: "GitHub App installed successfully",
      });
      // Remove query parameters by navigating to the same pathname without them.
      navigate(window.location.pathname, { replace: true });
    }
  }, [navigate, toast]);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

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
      <div className="space-y-8">
        <UserProfileCard profileData={profileData} />
        <div className="card p-6 border rounded-lg bg-card">
          <h3 className="text-lg font-semibold mb-4">GitHub Connection</h3>
          <GitHubConnectionChecker />
        </div>
        <ScriptsCard scripts={scripts} />
      </div>
    </div>
  );
}
