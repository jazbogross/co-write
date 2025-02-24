
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function GitHubConnectionChecker() {
  const [isChecking, setIsChecking] = useState(false);
  const { toast } = useToast();

  const verifyGitHubInstallation = async () => {
    setIsChecking(true);
    try {
      const installationId = localStorage.getItem('github_app_installation_id');
      console.log(installationId);
      if (!installationId) {
        // If no installation ID, redirect to install page
        console.error('No GitHub installation ID found');
        window.location.href = `https://github.com/apps/script-editor/installations/new?state=${encodeURIComponent(window.location.origin + '/github/callback')}`;
        return;
      }

      const { data, error } = await supabase.functions.invoke('verify-github-installation', {
        body: { installationId }
      });

      if (error || !data?.active) {
        console.error('GitHub verification error:', error);
        localStorage.removeItem('github_app_installation_id');
        window.location.href = `https://github.com/apps/script-editor/installations/new?state=${encodeURIComponent(window.location.origin + '/github/callback')}`;
        return;
      }

      toast({
        title: "Success",
        description: "GitHub connection verified successfully",
      });
    } catch (error) {
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
    <Button
      variant="outline"
      onClick={verifyGitHubInstallation}
      disabled={isChecking}
      className="w-full"
    >
      <Github className="mr-2 h-4 w-4" />
      {isChecking ? "Checking GitHub Connection..." : "Check GitHub Connection"}
    </Button>
  );
}
