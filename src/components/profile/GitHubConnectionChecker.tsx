
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";

export function GitHubConnectionChecker() {
  const [isLoading, setIsLoading] = useState(true);
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadGitHubConnection();
  }, []);

  const loadGitHubConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("github_access_token")
        .eq("id", user.id)
        .maybeSingle();

      if (profile?.github_access_token) {
        setGithubToken(profile.github_access_token);
      }
    } catch (error) {
      console.error("Error loading GitHub connection:", error);
      toast({
        title: "Error",
        description: "Failed to load GitHub connection status",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGitHubAuth = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo',
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("GitHub auth error:", error);
      toast({
        title: "Error",
        description: "Failed to connect GitHub account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading GitHub connection status...</div>;
  }

  if (!githubToken) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Connect your GitHub account to create and manage scripts
        </p>
        <Button
          variant="outline"
          onClick={handleGitHubAuth}
          disabled={isLoading}
          className="w-full"
        >
          <Github className="mr-2 h-4 w-4" />
          Connect GitHub Account
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">
        <h4 className="font-medium mb-2">GitHub Connection Status</h4>
        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Github className="mr-2 h-4 w-4 text-green-500" />
            <span className="text-green-600">Connected to GitHub</span>
          </div>
          <p className="text-xs text-muted-foreground break-all">
            Token: {githubToken}
          </p>
        </div>
      </div>
    </div>
  );
};
