
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function GitHubConnectionChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const checkGitHubAppInstallation = async () => {
    setIsChecking(true);
    try {
      console.log("Starting GitHub App installation check...");
      const installationId = localStorage.getItem("github_app_installation_id");
      console.log("Retrieved installation ID from localStorage:", installationId);
      
      if (!installationId) {
        console.log("No GitHub installation ID found, redirecting to installation page");
        const callbackUrl = `${window.location.origin}/github/callback`;
        const state = window.location.pathname;
        window.location.href = `https://github.com/apps/script-editor/installations/new?state=${state}&redirect_uri=${callbackUrl}`;
        return;
      }

      console.log("Verifying installation ID with Supabase function...");
      const { data, error } = await supabase.functions.invoke("verify-github-installation", {
        body: { installationId },
      });
      console.log("Supabase function response:", { data, error });

      if (error || !data?.active) {
        console.error("GitHub verification error:", error);
        localStorage.removeItem("github_app_installation_id");
        console.log("Removed invalid installation ID from localStorage");
        const callbackUrl = `${window.location.origin}/github/callback`;
        const state = window.location.pathname;
        console.log("Redirecting user to GitHub App installation page...");
        window.location.href = `https://github.com/apps/script-editor/installations/new?state=${state}&redirect_uri=${callbackUrl}`;
        return;
      }

      toast({
        title: "Success",
        description: "GitHub App installation verified successfully",
      });
    } catch (error: any) {
      console.error("GitHub verification error:", error);
      toast({
        title: "Error",
        description: "Failed to verify GitHub connection",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="space-y-4">
      <Button
        variant="outline"
        onClick={checkGitHubAppInstallation}
        disabled={isChecking}
        className="w-full"
      >
        <Github className="mr-2 h-4 w-4" />
        {isChecking ? "Checking GitHub App Installation..." : "Install GitHub App"}
      </Button>
    </div>
  );
}
