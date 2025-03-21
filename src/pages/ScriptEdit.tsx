
import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DeltaTextEditor } from "@/components/DeltaTextEditor";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useSession } from "@supabase/auth-helpers-react";

const ScriptEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const session = useSession();
  
  const [script, setScript] = useState<{
    title: string;
    admin_id: string;
    github_owner: string;
    github_repo: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);

  useEffect(() => {
    const loadScript = async () => {
      try {
        if (!id) {
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
          .select("title, admin_id, github_owner, github_repo")
          .eq("id", id)
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
  }, [id, navigate, session, location.pathname]);

  const handleCommitToGithub = async (content: string) => {
    if (!script || !id || !githubToken) return;
    
    try {
      // Call the Supabase function to commit changes to GitHub
      const { data, error } = await supabase.functions.invoke("commit-script-changes", {
        body: {
          scriptId: id,
          content: content,
          githubAccessToken: githubToken
        }
      });

      if (error) {
        console.error("Error committing to GitHub:", error);
        toast.error("Failed to commit to GitHub");
      } else {
        toast.success("Changes committed to GitHub");
      }
    } catch (githubError) {
      console.error("Error with GitHub integration:", githubError);
      toast.error("Failed to sync with GitHub");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!script || !id) {
    return null;
  }

  return (
    <div className="container min-w-screen">
      <Card>
        <CardHeader>
          <CardTitle>{script.title}</CardTitle>
          <CardDescription>
            {isAdmin ? "Edit your script" : "Suggest changes to this script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeltaTextEditor 
            scriptId={id} 
            isAdmin={isAdmin} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptEdit;
