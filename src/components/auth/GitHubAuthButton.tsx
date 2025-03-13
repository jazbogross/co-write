
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GitHubAuthButtonProps {
  loading: boolean;
  setLoading: (loading: boolean) => void;
}

const GitHubAuthButton = ({ loading, setLoading }: GitHubAuthButtonProps) => {
  const { toast: uiToast } = useToast();

  const handleGitHubAuth = async () => {
    try {
      setLoading(true);
      console.log("Auth: Initiating GitHub OAuth");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo',
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error("Auth: GitHub OAuth error:", error);
        uiToast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        console.log("Auth: GitHub OAuth initiated successfully");
      }
    } catch (error) {
      console.error('GitHub auth error:', error);
      uiToast({
        title: "Error",
        description: "Failed to authenticate with GitHub",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full" 
      onClick={handleGitHubAuth}
      disabled={loading}
    >
      <Github className="mr-2 h-4 w-4" />
      Continue with GitHub
    </Button>
  );
};

export default GitHubAuthButton;
