
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUserData } from "@/hooks/useUserData";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

interface CreateScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScriptCreated: (script: any) => void;
}

export function CreateScriptDialog({ open, onOpenChange, onScriptCreated }: CreateScriptDialogProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast: uiToast } = useToast();
  const { userId, authProvider } = useUserData();
  const [githubRepo, setGithubRepo] = useState<string | null>(null);
  const [githubOwner, setGithubOwner] = useState<string | null>(null);
  const [needsGithubRepo, setNeedsGithubRepo] = useState(false);

  useEffect(() => {
    if (open && userId) {
      checkUserGithubRepo();
    }
  }, [open, userId]);

  const checkUserGithubRepo = async () => {
    if (!userId) return;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('github_main_repo, github_username, github_access_token')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      if (profile?.github_main_repo && profile?.github_username) {
        setGithubRepo(profile.github_main_repo);
        setGithubOwner(profile.github_username);
        setNeedsGithubRepo(false);
      } else if (profile?.github_access_token) {
        setNeedsGithubRepo(true);
      } else {
        setNeedsGithubRepo(false);
      }
    } catch (error) {
      console.error('Error checking user GitHub repo:', error);
    }
  };

  const createGithubRepo = async () => {
    if (!userId) return null;
    
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('github_access_token')
        .eq('id', userId)
        .single();
      
      if (!profile?.github_access_token) {
        toast.error('GitHub token not found. Please connect your GitHub account.');
        return null;
      }
      
      const { data, error } = await supabase.functions.invoke('create-github-repo', {
        body: {
          userId: userId,
          githubAccessToken: profile.github_access_token
        }
      });
      
      if (error) throw error;
      if (!data || !data.name || !data.owner) {
        throw new Error('Invalid response from GitHub repository creation');
      }
      
      // Update local state with new repo details
      setGithubRepo(data.name);
      setGithubOwner(data.owner);
      setNeedsGithubRepo(false);
      
      return { name: data.name, owner: data.owner };
    } catch (error) {
      console.error('Error creating GitHub repo:', error);
      toast.error('Failed to create GitHub repository');
      return null;
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) {
      uiToast({
        title: "Error",
        description: "Please enter a script title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      if (!userId) throw new Error("No user found");
      
      // Ensure we have a GitHub repo
      let repo = { name: githubRepo, owner: githubOwner };
      
      if (needsGithubRepo || !githubRepo || !githubOwner) {
        const newRepo = await createGithubRepo();
        if (!newRepo) {
          setIsCreating(false);
          return;
        }
        repo = newRepo;
      }

      // Generate a unique folder name for the script
      const scriptFolderSuffix = uuidv4().substring(0, 8);
      const scriptFolderName = `${newTitle.toLowerCase().replace(/\s+/g, '-')}-${scriptFolderSuffix}`;

      // Create script in database
      const { data: script, error: scriptError } = await supabase
        .from("scripts")
        .insert([{
          title: newTitle,
          admin_id: userId,
          is_private: isPrivate,
          github_repo: repo.name,
          github_owner: repo.owner,
          folder_name: scriptFolderName, // Set folder name right away
        }])
        .select()
        .single();

      if (scriptError) throw scriptError;
      if (!script) throw new Error('Script was not created');

      console.log("Script created:", script);

      // Initialize content for the script in database first
      const initialContent = JSON.stringify({ 
        ops: [{ insert: `# ${newTitle}\n\nInitial content for ${newTitle}.\n` }] 
      });

      // Save the initial script content to the database before GitHub operations
      try {
        await supabase
        .from('scripts')
        .update({
          content: JSON.parse(initialContent),
          updated_at: new Date().toISOString()
        })
        .eq('id', script.id);
      
        
        console.log("Initial content saved to database");
      } catch (contentError) {
        console.error("Error saving initial content to database:", contentError);
        // Continue with GitHub operations even if content saving fails
      }

      // Get the profile to include the username in the README
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, github_access_token')
        .eq('id', userId)
        .single();

      if (!profile?.github_access_token) {
        throw new Error('GitHub access token not found. Please reconnect your GitHub account.');
      }

      const username = profile?.username || 'unknown user';
      const createdDate = new Date().toISOString();

      // Create the initial README content
      const readmeContent = `# ${newTitle}\n\n` +
        `- **Admin:** ${username}\n` +
        `- **Created:** ${new Date(createdDate).toLocaleDateString()}\n` +
        `- **Last Updated:** ${new Date(createdDate).toLocaleDateString()}\n` +
        `- **Suggestions:** 0\n` +
        `- **Accepted Suggestions:** 0\n\n` +
        `This script was created with the Rewrite application.`;

      console.log("Initializing GitHub structure for the script");
      try {
        const initResponse = await supabase.functions.invoke("commit-script-changes", {
          body: {
            scriptId: script.id,
            content: initialContent,
            githubAccessToken: profile.github_access_token,
            scriptFolderName: scriptFolderName,
            readmeContent: readmeContent,
            createFolderStructure: true
          }
        });
        
        if (initResponse.error) {
          console.error("Error initializing script structure:", initResponse.error);
          toast.warning("Script created, but GitHub initialization failed. You can try again later.");
        } else {
          console.log("GitHub structure initialized successfully:", initResponse.data);
        }
      } catch (initError) {
        console.error("Exception initializing script structure:", initError);
        toast.warning("Script created, but GitHub initialization failed. You can try again later.");
      }

      // Update script record with content regardless of GitHub status
      await supabase
        .from('scripts')
        .update({ 
          content: JSON.parse(initialContent),
          updated_at: new Date().toISOString()
        })
        .eq('id', script.id);

      onScriptCreated(script);
      setNewTitle("");
      onOpenChange(false);
      toast.success("New script created successfully");
    } catch (error: any) {
      console.error("Script creation error:", error);
      toast.error(error.message || "Failed to create script");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Script</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
            <Label htmlFor="private">Private Script</Label>
          </div>
          {needsGithubRepo && (
            <div className="bg-amber-50 p-3 rounded border border-amber-200 text-amber-800 text-sm">
              A GitHub repository will be created for your scripts when you click Create.
            </div>
          )}
          {githubRepo && githubOwner && (
            <div className="bg-green-50 p-3 rounded border border-green-200 text-green-800 text-sm">
              Script will be created in your GitHub repository: {githubOwner}/{githubRepo}
            </div>
          )}
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
