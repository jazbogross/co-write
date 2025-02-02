import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Github } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface GitHubConnectionCardProps {
  isGithubConnected: boolean;
}

export function GitHubConnectionCard({ isGithubConnected }: GitHubConnectionCardProps) {
  const { toast } = useToast();

  const handleGithubConnect = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
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
      toast({
        title: "Error",
        description: "Failed to connect GitHub account",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>GitHub Connection</CardTitle>
        <CardDescription>
          Connect your GitHub account to enable private repositories
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isGithubConnected ? (
          <div className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            <span className="text-sm text-muted-foreground">GitHub account connected</span>
          </div>
        ) : (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleGithubConnect}
          >
            <Github className="mr-2 h-4 w-4" />
            Connect GitHub Account
          </Button>
        )}
      </CardContent>
    </Card>
  );
}