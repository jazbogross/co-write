import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { useUserData } from "@/hooks/useUserData";

export function GitHubConnectionCard() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { toast: uiToast } = useToast();
  const { userId, authProvider } = useUserData();

  useEffect(() => {
    console.log("🔗 GITHUB: Checking GitHub connection status...");
    if (userId) {
      checkGitHubConnection();
    } else {
      setIsLoading(false);
      setIsConnected(false);
    }
  }, [userId]);

  const checkGitHubConnection = async () => {
    try {
      setIsLoading(true);
      
      // First check if user is authenticated via GitHub
      if (authProvider === 'github') {
        console.log("🔗 GITHUB: User is authenticated via GitHub");
      }
      
      console.log("🔗 GITHUB: Fetching profile for user:", userId);
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("github_access_token")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("🔗 GITHUB: Error fetching profile:", error);
        throw error;
      }

      console.log("🔗 GITHUB: GitHub connection status:", profile);
      setAccessToken(profile?.github_access_token || null);
      
      // Check if user is authenticated via GitHub OR has an access token
      if (authProvider === 'github' || profile?.github_access_token) {
        console.log("🔗 GITHUB: GitHub is connected", 
          profile?.github_access_token 
            ? `with access token: ${profile.github_access_token.substring(0, 10)}...` 
            : "via auth provider");
        setIsConnected(true);
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
          redirectTo: `${window.location.origin}/auth`,
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
            {authProvider === 'github' && (
              <p className="text-xs text-muted-foreground">
                Authenticated via GitHub
              </p>
            )}
            {accessToken && (
              <p className="text-xs text-muted-foreground">
                Access token: {accessToken.substring(0, 10)}...
              </p>
            )}
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
