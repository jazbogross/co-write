
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DeltaEditor } from "@/components/DeltaEditor";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const ScriptEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
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
        if (user.id === scriptData.admin_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("github_access_token")
            .eq("id", user.id)
            .single();

          if (profileData?.github_access_token) {
            setGithubToken(profileData.github_access_token);
          }
        }

        setScript(scriptData);
        setIsAdmin(user.id === scriptData.admin_id);
        setLoading(false);
      } catch (error) {
        console.error("Error loading script:", error);
        toast.error("Failed to load script");
        navigate("/profile");
      }
    };

    loadScript();
  }, [id, navigate]);

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
          <DeltaEditor 
            scriptId={id} 
            isAdmin={isAdmin} 
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptEdit;
