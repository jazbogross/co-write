
import { useState } from "react";
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
import { useUserData } from "@/hooks/useUserData";

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
  const [newTitle, setNewTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { authProvider } = useUserData();

  const verifyGitHubConnection = async () => {
    console.log("CreateScriptDialog: Verifying GitHub connection...");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    console.log("CreateScriptDialog: Auth provider:", authProvider);
    
    // First check if user authenticated with GitHub
    if (authProvider === 'github') {
      console.log("CreateScriptDialog: User authenticated with GitHub");
      
      // Now check if we have the access token
      const { data: profile } = await supabase
        .from('profiles')
        .select('github_access_token')
        .eq('id', user.id)
        .single();

      console.log("CreateScriptDialog: GitHub access token:", profile?.github_access_token ? "Found" : "Not found");
      
      if (profile?.github_access_token) {
        return profile.github_access_token;
      }
      
      throw new Error('GitHub access token not found. Please reconnect your GitHub account in profile settings.');
    }
    
    throw new Error('GitHub not connected. Please connect your GitHub account in the profile settings.');
  };

  const createGitHubRepository = async (scriptTitle: string): Promise<GitHubRepo> => {
    const githubAccessToken = await verifyGitHubConnection();

    const { data: userData } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userData.user?.id)
      .single();

    const { data, error } = await supabase.functions.invoke('create-github-repo', {
      body: {
        scriptName: scriptTitle.toLowerCase().replace(/\s+/g, '-'),
        originalCreator: profile?.username || 'user',
        coAuthors: [],
        isPrivate: isPrivate,
        githubAccessToken
      }
    });

    if (error) throw new Error(error.message);
    if (!data?.name || !data?.owner) throw new Error('Invalid repository data received');
    
    return data as GitHubRepo;
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

      // First verify GitHub connection and create repository
      const repo = await createGitHubRepository(newTitle);

      // Then create the script in our database
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
      if (!script) throw new Error('Script was not created');

      onScriptCreated(script);
      setNewTitle("");
      onOpenChange(false);
      toast({
        title: "Success",
        description: "New script and GitHub repository created",
      });
    } catch (error: any) {
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
          <DialogDescription>
            Enter a title for your new script and choose visibility settings.
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}
