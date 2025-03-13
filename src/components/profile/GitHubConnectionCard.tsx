
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";

export function GitHubConnectionCard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [installationId, setInstallationId] = useState<string | null>(null);
  const { toast: uiToast } = useToast();

  useEffect(() => {
    console.log("🔗 GITHUB: Checking GitHub connection status...");
    checkGitHubConnection();
  }, []);

  const checkGitHubConnection = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("🔗 GITHUB: No user found");
        setIsConnected(false);
        setIsLoading(false);
        return;
      }

      console.log("🔗 GITHUB: Fetching profile for user:", user.id);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("github_app_installation_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("🔗 GITHUB: Error fetching profile:", error);
        throw error;
      }

      console.log("🔗 GITHUB: GitHub connection status:", profile);
      if (profile?.github_app_installation_id) {
        console.log("🔗 GITHUB: GitHub is connected with installation ID:", profile.github_app_installation_id);
        setIsConnected(true);
        setInstallationId(profile.github_app_installation_id);
      } else {
        console.log("🔗 GITHUB: GitHub is not connected");
        setIsConnected(false);
      }
    } catch (error) {
      console.error("🔗 GITHUB: Error checking GitHub connection:", error);
      toast.error("Failed to check GitHub connection status");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGithubConnect = async () => {
    try {
      setIsLoading(true);
      console.log("🔗 GITHUB: Initiating GitHub connection...");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo',
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        console.error("🔗 GITHUB: OAuth error:", error);
        uiToast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("🔗 GITHUB: Connection error:", error);
      uiToast({
        title: "Error",
        description: "Failed to connect GitHub account",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>GitHub Connection</CardTitle>
          <CardDescription>
            Checking GitHub connection status...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>GitHub Connection</CardTitle>
        <CardDescription>
          {isConnected 
            ? "Your GitHub account is connected"
            : "Connect your GitHub account to enable private repositories"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isConnected ? (
          <div className="space-y-4">
            <div className="flex items-center text-sm">
              <Github className="mr-2 h-4 w-4 text-green-500" />
              <span className="text-green-600">Connected to GitHub</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Installation ID: {installationId}
            </p>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleGithubConnect}
            disabled={isLoading}
          >
            <Github className="mr-2 h-4 w-4" />
            Connect GitHub Account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
