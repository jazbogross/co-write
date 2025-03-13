
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DeltaTextEditor } from "@/components/DeltaTextEditor";
import { toast } from "sonner";
import { createSuggestion, saveScriptContent, fetchScriptContent } from "@/services/scriptService";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeltaStatic } from "quill";
import Delta from "quill-delta";

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
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);

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

        // Load original content for diff comparison
        const content = await fetchScriptContent(id);
        if (content) {
          setOriginalContent(content.contentDelta);
        } else {
          // Initialize with empty Delta if no content exists
          setOriginalContent(new Delta([{ insert: '\n' }]) as unknown as DeltaStatic);
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

  const handleSuggestChange = async (delta: DeltaStatic) => {
    if (!script || !id || !originalContent) return;

    try {
      if (isAdmin) {
        // If admin, save directly
        const success = await saveScriptContent(id, delta, true);
        
        if (success) {
          toast.success("Changes saved successfully");
          
          // If we have GitHub integration, commit changes to GitHub
          if (githubToken && script.github_owner && script.github_repo) {
            try {
              // Call the Supabase function to commit changes to GitHub
              const { data, error } = await supabase.functions.invoke("commit-script-changes", {
                body: {
                  scriptId: id,
                  content: JSON.stringify(delta),
                  githubAccessToken: githubToken
                }
              });

              if (error) {
                console.error("Error committing to GitHub:", error);
                toast.error("Changes saved but failed to commit to GitHub");
              } else {
                toast.success("Changes saved and committed to GitHub");
              }
            } catch (githubError) {
              console.error("Error with GitHub integration:", githubError);
              toast.error("Changes saved but failed to sync with GitHub");
            }
          }
        } else {
          toast.error("Failed to save changes");
        }
      } else {
        // For non-admin users, create a suggestion by comparing with the original
        const suggestionId = await createSuggestion(id, originalContent, delta);
        
        if (suggestionId) {
          toast.success("Your changes have been submitted for review");
        } else {
          toast.error("Failed to submit changes");
        }
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
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
            isAdmin={isAdmin}
            scriptId={id}
            onSuggestChange={handleSuggestChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptEdit;
