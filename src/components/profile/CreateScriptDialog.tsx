
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

export function CreateScriptDialog({ open, onOpenChange, onScriptCreated }: CreateScriptDialogProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [hasGithubConnection, setHasGithubConnection] = useState(false);
  const { toast } = useToast();

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

        // Check if user has GitHub identity
        const { data: { identities } } = await supabase.auth.getUser();
        const hasGithub = identities?.some(identity => identity.provider === 'github');
        setHasGithubConnection(!!hasGithub);
      } catch (error) {
        console.error('Error checking GitHub connection:', error);
      }
    };

    checkGithubConnection();
  }, []);

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

  const createGitHubRepository = async (scriptTitle: string) => {
    try {
      const { data: response, error } = await supabase.functions.invoke('create-github-repo', {
        body: {
          scriptName: scriptTitle.toLowerCase().replace(/\s+/g, '-'),
          originalCreator: username || 'user',
          coAuthors: [],
          isPrivate: isPrivate
        }
      });

      if (error) throw error;
      return response;
    } catch (error) {
      console.error("Error creating GitHub repository:", error);
      throw error;
    }
  };

  const handleCreate = async () => {
    if (!hasGithubConnection) {
      toast({
        title: "GitHub Connection Required",
        description: "Please connect your GitHub account before creating a script",
        variant: "destructive",
      });
      return;
    }

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

      // Create GitHub repository first
      const repo = await createGitHubRepository(newTitle);

      // Then create the script
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

      if (scriptError) throw scriptError;

      if (script) {
        onScriptCreated(script);
        setNewTitle("");
        onOpenChange(false);
        toast({
          title: "Success",
          description: "New script and GitHub repository created",
        });
      }
    } catch (error) {
      console.error("Script creation error:", error);
      toast({
        title: "Error",
        description: "Failed to create script and repository",
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
          {!hasGithubConnection && (
            <DialogDescription>
              To create a script, you need to connect your GitHub account first.
            </DialogDescription>
          )}
        </DialogHeader>
        {!hasGithubConnection ? (
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
        ) : (
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
