
import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSession } from "@supabase/auth-helpers-react";

interface ScriptData {
  title: string;
  admin_id: string;
  github_owner: string;
  github_repo: string;
  folder_name: string;
}

export const useScriptData = (scriptId: string | undefined) => {
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  
  const [script, setScript] = useState<ScriptData | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);

  useEffect(() => {
    const loadScript = async () => {
      try {
        if (!scriptId) {
          toast.error("No script ID provided");
          navigate("/profile");
          return;
        }

        // Check if user is authenticated
        if (!session?.user) {
          // Save current script path for redirecting back after login
          navigate("/auth", { state: { from: location.pathname } });
          return;
        }

        // Get script data
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .select("title, admin_id, github_owner, github_repo, folder_name")
          .eq("id", scriptId)
          .single();

        if (scriptError) throw scriptError;
        if (!scriptData) {
          toast.error("Script not found");
          navigate("/profile");
          return;
        }

        // Get GitHub token if admin
        if (session.user.id === scriptData.admin_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("github_access_token")
            .eq("id", session.user.id)
            .single();

          if (profileData?.github_access_token) {
            setGithubToken(profileData.github_access_token);
          }
        }

        setScript(scriptData);
        setIsAdmin(session.user.id === scriptData.admin_id);
        setLoading(false);
      } catch (error) {
        console.error("Error loading script:", error);
        toast.error("Failed to load script");
        navigate("/profile");
      }
    };

    loadScript();
  }, [scriptId, navigate, session, location.pathname]);

  return {
    script,
    isAdmin,
    loading,
    githubToken,
    userId: session?.user?.id
  };
};
