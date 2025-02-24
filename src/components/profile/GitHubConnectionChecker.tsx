
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
      const installationId = localStorage.getItem('github_app_installation_id');
      
      if (!installationId) {
        // If no installation ID, redirect to install page
        console.log('No GitHub installation ID found, redirecting to installation page');
        const callbackUrl = encodeURIComponent(window.location.origin + '/github/callback');
        const state = encodeURIComponent(window.location.pathname);
        window.location.href = `https://github.com/apps/script-editor/installations/new?state=${state}&redirect_uri=${callbackUrl}`;
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-github-installation', {
        body: { installationId }
      });

      if (error || !data?.active) {
        console.error('GitHub verification error:', error);
        localStorage.removeItem('github_app_installation_id');
        const callbackUrl = encodeURIComponent(window.location.origin + '/github/callback');
        const state = encodeURIComponent(window.location.pathname);
        window.location.href = `https://github.com/apps/script-editor/installations/new?state=${state}&redirect_uri=${callbackUrl}`;
        return;
      }

      toast({
        title: "Success",
        description: "GitHub App installation verified successfully",
      });
    } catch (error: any) {
      console.error('GitHub verification error:', error);
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
