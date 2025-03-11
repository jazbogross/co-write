
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { TextEditor } from "@/components/TextEditor";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DeltaContent } from "@/utils/editor/types";
import { toast } from "sonner";

const ScriptEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [script, setScript] = useState<{
    title: string;
    admin_id: string;
    github_owner: string;
    github_repo: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [originalContent, setOriginalContent] = useState("");
  const [githubToken, setGithubToken] = useState<string | null>(null);

  useEffect(() => {
    const loadScript = async () => {
      try {
        if (!id) {
          toast({
            title: "Error",
            description: "No script ID provided",
            variant: "destructive",
          });
          navigate("/profile");
          return;
        }

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate("/auth");
          return;
        }

        // Get script data (without content - we'll get that from script_content)
        const { data: scriptData, error: scriptError } = await supabase
          .from("scripts")
          .select("title, admin_id, github_owner, github_repo")
          .eq("id", id)
          .single();

        if (scriptError) throw scriptError;
        if (!scriptData) {
          toast({
            title: "Error",
            description: "Script not found",
            variant: "destructive",
          });
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

        // Fetch script content from script_content table
        const { data: contentData, error: contentError } = await supabase
          .from("script_content")
          .select("content")
          .eq("script_id", id)
          .order("line_number", { ascending: true });

        if (!contentError && contentData && contentData.length > 0) {
          // Combine the content from all lines
          const combinedContent = contentData.map(line => line.content).join("\n");
          setOriginalContent(combinedContent);
          console.log("Original content loaded:", combinedContent.substring(0, 100) + "...");
        } else {
          console.log("No content found or error fetching content:", contentError);
          setOriginalContent("");
        }

        setScript(scriptData);
        setIsAdmin(user.id === scriptData.admin_id);
        setLoading(false);
      } catch (error) {
        console.error("Error loading script:", error);
        toast({
          title: "Error",
          description: "Failed to load script",
          variant: "destructive",
        });
        navigate("/profile");
      }
    };

    loadScript();
  }, [id, navigate, toast]);

  const handleSuggestChange = async (updatedContent: string | DeltaContent) => {
    if (!script || !id || !isAdmin) return;

    try {
      // If we have a GitHub token and repo info, commit to GitHub
      if (githubToken && script.github_owner && script.github_repo) {
        // Convert content to JSON string if it's an object
        const contentToSave = typeof updatedContent === 'string' 
          ? updatedContent 
          : JSON.stringify(updatedContent, null, 2);

        console.log("Committing content to GitHub:", contentToSave.substring(0, 100) + "...");
        
        // Call the Supabase function to commit changes to GitHub
        const { data, error } = await supabase.functions.invoke("commit-script-changes", {
          body: {
            scriptId: id,
            content: contentToSave,
            githubAccessToken: githubToken
          }
        });

        if (error) {
          console.error("Error committing to GitHub:", error);
          toast.error("Failed to commit changes to GitHub");
          return;
        }

        console.log("Successfully committed to GitHub:", data);
        toast.success("Changes saved and committed to GitHub");
      } else {
        // Just save locally without GitHub commit
        toast.success("Changes saved successfully");
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

  console.log("Rendering TextEditor with scriptId:", id);

  return (
    <div className="container min-w-sreen">
      <Card>
        <CardHeader>
          <CardTitle>{script.title}</CardTitle>
          <CardDescription>
            {isAdmin ? "Edit your script" : "Suggest changes to this script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TextEditor
            isAdmin={isAdmin}
            originalContent={originalContent}
            scriptId={id}
            onSuggestChange={handleSuggestChange}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default ScriptEdit;
