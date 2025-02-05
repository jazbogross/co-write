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

interface CreateScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScriptCreated: (script: any) => void;
}

export function CreateScriptDialog({ open, onOpenChange, onScriptCreated }: CreateScriptDialogProps) {
  const [newTitle, setNewTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const createGitHubRepository = async (scriptTitle: string, userId: string) => {
    try {
      const { data: repo, error } = await supabase
        .from("github_repositories")
        .insert([{
          name: scriptTitle,
          owner: userId,
          is_private: false,
          user_id: userId
        }])
        .select()
        .single();

      if (error) throw error;
      return repo;
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

      // Create GitHub repository first
      const repo = await createGitHubRepository(newTitle, user.id);

      // Then create the script
      const { data: script, error: scriptError } = await supabase
        .from("scripts")
        .insert([{
          title: newTitle,
          admin_id: user.id,
          is_private: false,
          content: "",
          github_repo: repo.name,
          github_owner: repo.owner
        }])
        .select()
        .single();

      if (scriptError) {
        // If script creation fails, attempt to delete the repository
        await supabase
          .from("github_repositories")
          .delete()
          .eq("id", repo.id);
        throw scriptError;
      }

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
        </DialogHeader>
        <div className="py-4">
          <Input
            placeholder="Enter script title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
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