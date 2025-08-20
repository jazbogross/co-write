
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { toast } from 'sonner';

interface GitHubAuthButtonProps {
  disabled?: boolean;
}

export const GitHubAuthButton = ({ disabled = false }: GitHubAuthButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubAuth = async () => {
    try {
      setIsLoading(true);
      console.log("Auth: Initiating GitHub OAuth");
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          scopes: 'repo',
          redirectTo: `${window.location.origin}/auth`,
        },
      });

      if (error) {
        console.error("Auth: GitHub OAuth error:", error);
        toast.error(error.message);
      } else {
        console.log("Auth: GitHub OAuth initiated successfully");
      }
    } catch (error) {
      console.error('GitHub auth error:', error);
      toast.error("Failed to authenticate with GitHub");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      className="w-full" 
      onClick={handleGitHubAuth}
      disabled={disabled || isLoading}
    >
      <Github className="mr-2 h-4 w-4" />
      Continue with GitHub
    </Button>
  );
};
