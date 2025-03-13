import { useState } from "react";
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
  const { toast: uiToast } = useToast();
  const { userId, authProvider } = useUserData();

  const verifyGitHubConnection = async () => {
    console.log("CreateScriptDialog: Verifying GitHub connection...");
    console.log("CreateScriptDialog: Calling supabase.auth.getUser()");
    const { data: { user } } = await supabase.auth.getUser();
    console.log("CreateScriptDialog: supabase.auth.getUser() returned:", user);
    if (!user) {
      console.error("CreateScriptDialog: No authenticated user found");
      throw new Error('No authenticated user found');
    }

    console.log("CreateScriptDialog: Auth provider:", authProvider);
    
    console.log("CreateScriptDialog: Fetching profile for user:", user.id);
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('github_access_token')
      .eq('id', user.id)
      .maybeSingle();
      
    if (profileError) {
      console.error("CreateScriptDialog: Error fetching profile:", profileError);
      console.log("CreateScriptDialog: Profile error details:", JSON.stringify(profileError));
      throw new Error('Error verifying GitHub connection');
    }
    
    console.log("CreateScriptDialog: Profile data:", profile ? "Found" : "Not found");
    console.log("CreateScriptDialog: GitHub access token:", profile?.github_access_token ? "Present" : "Not present");
    
    // If user is authenticated via GitHub and already has a token
    if (authProvider === 'github' && profile?.github_access_token) {
      console.log("CreateScriptDialog: GitHub connection verified using token from profile.");
      return profile.github_access_token;
    } else if (profile?.github_access_token) {
      console.log("CreateScriptDialog: Using stored GitHub access token from profile.");
      return profile.github_access_token;
    }
    
    // If user is authenticated via GitHub but token is missing
    if (authProvider === 'github' && !profile?.github_access_token) {
      console.log("CreateScriptDialog: User authenticated via GitHub but token is missing.");
      console.log("CreateScriptDialog: Calling supabase.auth.getSession() to retrieve provider token.");
      const { data: sessionData } = await supabase.auth.getSession();
      console.log("CreateScriptDialog: supabase.auth.getSession() returned:", sessionData);
      const providerToken = sessionData?.session?.provider_token;
      
      if (providerToken) {
        console.log("CreateScriptDialog: Provider token found in session:", providerToken.substring(0, 10) + "...");
        
        if (!profile) {
          console.log("CreateScriptDialog: No profile found, creating a new profile with GitHub token.");
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({ 
              id: user.id,
              username: user.email?.split('@')[0] || 'user',
              github_access_token: providerToken,
              updated_at: new Date().toISOString()
            });
            
          if (insertError) {
            console.error("CreateScriptDialog: Failed to create profile:", insertError);
            console.log("CreateScriptDialog: Insert error details:", JSON.stringify(insertError));
            throw new Error('Failed to create profile with GitHub token');
          }
          console.log("CreateScriptDialog: New profile created with GitHub token.");
        } else {
          console.log("CreateScriptDialog: Updating existing profile with provider token.");
          const { error: updateError } = await supabase
            .from('profiles')
            .update({ 
              github_access_token: providerToken,
              updated_at: new Date().toISOString()
            })
            .eq('id', user.id);
            
          if (updateError) {
            console.error("CreateScriptDialog: Failed to update GitHub token:", updateError);
            console.log("CreateScriptDialog: Update error details:", JSON.stringify(updateError));
            throw new Error('Failed to update GitHub token');
          }
          console.log("CreateScriptDialog: Existing profile updated with new GitHub token.");
        }
        
        return providerToken;
      } else {
        console.error("CreateScriptDialog: No provider token found in session.");
        throw new Error('No provider token found in session');
      }
    }
    
    console.error("CreateScriptDialog: GitHub connection not found");
    throw new Error('GitHub not connected. Please connect your GitHub account in the profile settings.');
  };

  const createGitHubRepository = async (scriptTitle: string): Promise<GitHubRepo> => {
    console.log("CreateScriptDialog: Creating GitHub repository for script title:", scriptTitle);
    const githubAccessToken = await verifyGitHubConnection();
    console.log("CreateScriptDialog: Using GitHub access token:", githubAccessToken.substring(0, 10) + "...");
    
    console.log("CreateScriptDialog: Fetching user data for repository creation...");
    const { data: userData } = await supabase.auth.getUser();
    console.log("CreateScriptDialog: Fetched user data:", userData);
    
    console.log("CreateScriptDialog: Fetching profile for username...");
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', userData.user?.id)
      .single();
    console.log("CreateScriptDialog: Fetched profile username:", profile?.username);
    
    console.log("CreateScriptDialog: Invoking edge function 'create-github-repo' with payload:");
    console.log({
      scriptName: scriptTitle.toLowerCase().replace(/\s+/g, '-'),
      originalCreator: profile?.username || 'user',
      coAuthors: [],
      isPrivate: isPrivate,
      githubAccessToken,
    });
    
    const { data, error } = await supabase.functions.invoke('create-github-repo', {
      body: {
        scriptName: scriptTitle.toLowerCase().replace(/\s+/g, '-'),
        originalCreator: profile?.username || 'user',
        coAuthors: [],
        isPrivate: isPrivate,
        githubAccessToken,
      },
    });
    
    console.log("CreateScriptDialog: Edge function response:", { data, error });
    
    if (error) throw new Error(error.message);
    if (!data?.name || !data?.owner) throw new Error('Invalid repository data received');
    
    return data as GitHubRepo;
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
      
      console.log("CreateScriptDialog: Initiating repository creation...");
      const repo = await createGitHubRepository(newTitle);
      console.log("CreateScriptDialog: GitHub repository created:", repo);

      console.log("CreateScriptDialog: Inserting new script into the database...");
      const { data: script, error: scriptError } = await supabase
        .from("scripts")
        .insert([{
          title: newTitle,
          admin_id: userId,
          is_private: isPrivate,
          content: "",
          github_repo: repo.name,
          github_owner: repo.owner,
        }])
        .select()
        .single();

      if (scriptError) throw scriptError;
      if (!script) throw new Error('Script was not created');

      console.log("CreateScriptDialog: Script successfully created:", script);
      onScriptCreated(script);
      setNewTitle("");
      onOpenChange(false);
      toast.success("New script and GitHub repository created");
    } catch (error: any) {
      console.error("CreateScriptDialog: Script creation error:", error);
      toast.error(error.message || "Failed to create script and repository");
    } finally {
      setIsCreating(false);
      console.log("CreateScriptDialog: handleCreate process completed.");
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
