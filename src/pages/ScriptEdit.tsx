
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
import { SaveVersionDialog } from "@/components/editor/SaveVersionDialog";
import { SuggestionsPanel } from "@/components/editor/SuggestionsPanel";
import { DeltaStatic } from "quill";

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
    folder_name: string;
  } | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [currentContent, setCurrentContent] = useState<string | null>(null);
  const [showSuggestionsPanel, setShowSuggestionsPanel] = useState(false);
  const [pendingSuggestionsCount, setPendingSuggestionsCount] = useState(0);

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
          .select("title, admin_id, github_owner, github_repo, folder_name")
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
        
        // If admin, check for pending suggestions
        if (session.user.id === scriptData.admin_id) {
          checkPendingSuggestions(id);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error loading script:", error);
        toast.error("Failed to load script");
        navigate("/profile");
      }
    };

    loadScript();
  }, [id, navigate, session, location.pathname]);

  const checkPendingSuggestions = async (scriptId: string) => {
    try {
      const { data, error, count } = await supabase
        .from('script_suggestions')
        .select('id', { count: 'exact' })
        .eq('script_id', scriptId)
        .eq('status', 'pending');
      
      if (error) throw error;
      
      setPendingSuggestionsCount(count || 0);
    } catch (err) {
      console.error('Error checking pending suggestions:', err);
    }
  };

  const handleCommitToGithub = async (content: string) => {
    if (!script || !id || !githubToken) return false;
    
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
        return false;
      } else {
        toast.success("Changes committed to GitHub");
        return true;
      }
    } catch (githubError) {
      console.error("Error with GitHub integration:", githubError);
      toast.error("Failed to sync with GitHub");
      return false;
    }
  };

  const handleSaveVersion = (content: string) => {
    setCurrentContent(content);
    setIsVersionDialogOpen(true);
  };

  const saveVersion = async (versionName: string) => {
    if (!script || !id || !githubToken || !currentContent) {
      setIsVersionDialogOpen(false);
      return;
    }
    
    setIsSavingVersion(true);
    
    try {
      // Generate a unique filename for the version
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const versionFileName = `${timestamp}.json`;
      
      // Call the Supabase function to save version to GitHub
      const { data, error } = await supabase.functions.invoke("commit-script-changes", {
        body: {
          scriptId: id,
          scriptTitle: script.title,
          content: currentContent,
          githubAccessToken: githubToken,
          versionName: versionName,
          versionFileName: versionFileName,
          saveAsVersion: true
        }
      });

      if (error) {
        console.error("Error saving version to GitHub:", error);
        toast.error("Failed to save version");
      } else {
        // Save reference to the version file path in the database
        const githubPath = `${script.folder_name}/versions/${versionFileName}`;
        const { error: dbError } = await supabase
          .from('script_versions')
          .insert({
            script_id: id,
            version_name: versionName,
            created_by: session?.user?.id,
            github_path: githubPath,
            content_delta: currentContent,
            version_number: 0  // Will be auto-incremented by a trigger
          });
          
        if (dbError) {
          console.error("Error saving version reference to database:", dbError);
          toast.warning("Version saved to GitHub but failed to save reference in database");
        } else {
          toast.success(`Version "${versionName}" saved successfully`);
          setIsVersionDialogOpen(false);
        }
      }
    } catch (githubError) {
      console.error("Error with GitHub integration:", githubError);
      toast.error("Failed to save version");
    } finally {
      setIsSavingVersion(false);
    }
  };

  const handleToggleSuggestions = () => {
    setShowSuggestionsPanel(!showSuggestionsPanel);
  };

  const handleAcceptSuggestion = (suggestionId: string, deltaDiff: DeltaStatic) => {
    // Refresh pending suggestions count
    checkPendingSuggestions(id!);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!script || !id) {
    return null;
  }

  return (
    <div className="container min-w-screen">
      {showSuggestionsPanel ? (
        <SuggestionsPanel 
          scriptId={id} 
          onAccept={handleAcceptSuggestion} 
          onClose={() => setShowSuggestionsPanel(false)} 
        />
      ) : (
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
              onCommitToGithub={handleCommitToGithub}
              onSaveVersion={handleSaveVersion}
              onToggleSuggestions={handleToggleSuggestions}
              pendingSuggestionsCount={pendingSuggestionsCount}
              hasPendingSuggestions={pendingSuggestionsCount > 0}
            />
          </CardContent>
        </Card>
      )}
      
      <SaveVersionDialog
        open={isVersionDialogOpen}
        onOpenChange={setIsVersionDialogOpen}
        onSave={saveVersion}
        isSaving={isSavingVersion}
      />
    </div>
  );
};

export default ScriptEdit;
