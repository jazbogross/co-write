
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGithubIntegration = (
  scriptId: string | undefined, 
  githubToken: string | null
) => {
  const [isVersionDialogOpen, setIsVersionDialogOpen] = useState(false);
  const [isSavingVersion, setIsSavingVersion] = useState(false);
  const [currentContent, setCurrentContent] = useState<string | null>(null);

  const handleCommitToGithub = async (content: string) => {
    if (!scriptId || !githubToken) return false;
    
    try {
      // Call the Supabase function to commit changes to GitHub
      const { data, error } = await supabase.functions.invoke("commit-script-changes", {
        body: {
          scriptId,
          content,
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

  const saveVersion = async (
    versionName: string, 
    script: { title: string; folder_name: string } | null, 
    userId: string | undefined
  ) => {
    if (!script || !scriptId || !githubToken || !currentContent || !userId) {
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
          scriptId,
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
            script_id: scriptId,
            version_name: versionName,
            created_by: userId,
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

  return {
    handleCommitToGithub,
    handleSaveVersion,
    saveVersion,
    isVersionDialogOpen,
    setIsVersionDialogOpen,
    isSavingVersion,
    currentContent
  };
};
