
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Github } from "lucide-react";

interface CreateScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScriptCreated: (script: any) => void;
}

interface GitHubRepo {
  name: string;
  owner: string;
  html_url: string;
}

export function CreateScriptDialog({ open, onOpenChange, onScriptCreated }: CreateScriptDialogProps) {
  const [step, setStep] = useState<'github-connect' | 'app-install' | 'create-script'>('github-connect');
  const [newTitle, setNewTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [hasGithubConnection, setHasGithubConnection] = useState(false);
  const { toast } = useToast();

  const verifyGitHubInstallation = async (installationId: string): Promise<boolean> => {
    if (!installationId || 
        installationId === "null" || 
        installationId === "undefined" || 
        installationId.trim() === "") {
      return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-github-installation', {
        body: { installationId }
      });
      if (error) {
        console.error('Error verifying GitHub installation:', error);
        return false;
      }
      return data?.active === true;
    } catch (error) {
      console.error('Error verifying GitHub installation:', error);
      return false;
    }
  };

  useEffect(() => {
    const checkGithubConnection = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUsername(profile.username);
        }

        const isGithubConnected =
          user.app_metadata?.provider === 'github' ||
          (user.app_metadata?.providers && user.app_metadata.providers.includes('github'));

        if (isGithubConnected) {
          setHasGithubConnection(true);
          const installationId = localStorage.getItem('github_app_installation_id');
          console.log("Installation ID from localStorage:", installationId);
          if (installationId && 
              installationId !== "null" && 
              installationId !== "undefined" && 
              installationId.trim() !== "") {
            const isValid = await verifyGitHubInstallation(installationId);
            if (isValid) {
              setStep('create-script');
            } else {
              setStep('app-install');
              localStorage.removeItem('github_app_installation_id');
            }
          } else {
            setStep('app-install');
          }
        } else {
          setStep('github-connect');
        }
      } catch (error) {
        console.error('Error checking GitHub connection:', error);
      }
    };

    if (open) {
      checkGithubConnection();
    }
  }, [open]);

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

  const handleGitHubAppInstall = () => {
    const callbackUrl = `${window.location.origin}/github/callback`;
    window.location.href = `https://github.com/apps/script-editor/installations/new?state=${encodeURIComponent(callbackUrl)}`;
  };

  const createGitHubRepository = async (scriptTitle: string): Promise<GitHubRepo> => {
    try {
      const installationId = localStorage.getItem('github_app_installation_id');
      if (!installationId || 
          installationId === "null" || 
          installationId === "undefined" || 
          installationId.trim() === "") {
        throw new Error('GitHub App not installed. Please install the app first.');
      }

      const { data, error } = await supabase.functions.invoke('create-github-repo', {
        body: {
          scriptName: scriptTitle.toLowerCase().replace(/\s+/g, '-'),
          originalCreator: username || 'user',
          coAuthors: [],
          isPrivate: isPrivate,
          installationId: installationId
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw new Error(error.message);
      }
      
      console.log('Repository creation response:', data);

      if (!data || typeof data.name !== 'string' || typeof data.owner !== 'string') {
        console.error('Invalid response data:', data);
        throw new Error('Invalid repository data received from GitHub');
      }

      return data as GitHubRepo;
    } catch (error) {
      console.error("Error creating GitHub repository:", error);
      throw error;
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user found");

      console.log('Creating GitHub repository...');
      const repo = await createGitHubRepository(newTitle);
      console.log('Repository created:', repo);

      const { data: script, error: scriptError } = await supabase
        .from("scripts")
        .insert([{
          title: newTitle,
          admin_id: user.id,
          is_private: isPrivate,
          content: "",
          github_repo: repo.name,
          github_owner: repo.owner
        }])
        .select()
        .single();

      if (scriptError) {
        console.error('Script creation error:', scriptError);
        throw scriptError;
      }

      if (!script) {
        throw new Error('Script was not created');
      }

      onScriptCreated(script);
      setNewTitle("");
      onOpenChange(false);
      toast({
        title: "Success",
        description: "New script and GitHub repository created",
      });
    } catch (error) {
      console.error("Script creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create script and repository",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Script</DialogTitle>
          {step === 'github-connect' && (
            <DialogDescription>
              To create a script, you need to connect your GitHub account first.
            </DialogDescription>
          )}
          {step === 'app-install' && (
            <DialogDescription>
              Please install the Script Editor GitHub App to continue.
            </DialogDescription>
          )}
        </DialogHeader>
        
        {step === 'github-connect' && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleGithubConnect}
            >
              <Github className="mr-2 h-4 w-4" />
              Connect GitHub Account
            </Button>
          </div>
        )}

        {step === 'app-install' && (
          <div className="flex justify-center">
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={handleGitHubAppInstall}
            >
              <Github className="mr-2 h-4 w-4" />
              Install GitHub App
            </Button>
          </div>
        )}

        {step === 'create-script' && (
          <>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Script Title</Label>
                <Input
                  id="title"
                  placeholder="Enter script title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="private"
                  checked={isPrivate}
                  onCheckedChange={setIsPrivate}
                />
                <Label htmlFor="private">Private Repository</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
