
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Repository } from "@/types/repository";
import { supabase } from "@/integrations/supabase/client";
import { RepositoryListItem } from "./RepositoryListItem";
import { RepositoryPermissionsDialog } from "./RepositoryPermissionsDialog";
import { toast } from "sonner";

export const RepositoryManagementCard = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchRepos();
  }, []);

  const fetchRepos = async () => {
    setIsLoading(true);
    try {
      // Fetch user scripts instead of github_repositories
      const { data, error } = await supabase
        .from("scripts")
        .select("id, title, created_at, admin_id, github_repo, github_owner, is_private")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Transform to Repository type
      const repos = data.map((repo): Repository => ({
        id: repo.id,
        name: repo.title,
        owner: repo.github_owner || "local",
        is_private: !!repo.is_private,
        created_at: repo.created_at
      }));

      setRepositories(repos);
    } catch (error) {
      console.error("Error fetching repositories:", error);
      toast.error("Failed to load repositories");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTogglePrivacy = async (repo: Repository) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("scripts")
        .update({ is_private: !repo.is_private })
        .eq("id", repo.id);

      if (error) throw error;

      // Update local state
      setRepositories(prev => 
        prev.map(r => r.id === repo.id ? { ...r, is_private: !r.is_private } : r)
      );
      
      toast.success(`Repository is now ${!repo.is_private ? 'private' : 'public'}`);
    } catch (error) {
      console.error("Error toggling privacy:", error);
      toast.error("Failed to update repository privacy");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this repository?")) return;
    
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", id);

      if (error) throw error;

      // Update local state
      setRepositories(prev => prev.filter(r => r.id !== id));
      toast.success("Repository deleted successfully");
    } catch (error) {
      console.error("Error deleting repository:", error);
      toast.error("Failed to delete repository");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenPermissions = (repo: Repository) => {
    setSelectedRepo(repo);
    setPermissionsOpen(true);
  };

  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Your Repositories</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading && repositories.length === 0 ? (
          <p>Loading repositories...</p>
        ) : repositories.length === 0 ? (
          <p>No repositories found. Create a script to get started.</p>
        ) : (
          <div className="space-y-4">
            {repositories.map((repo) => (
              <RepositoryListItem
                key={repo.id}
                repository={repo}
                onTogglePrivacy={handleTogglePrivacy}
                onDelete={handleDelete}
                onOpenPermissions={handleOpenPermissions}
                loading={isLoading}
              />
            ))}
          </div>
        )}

        {selectedRepo && (
          <RepositoryPermissionsDialog
            repository={selectedRepo}
            open={permissionsOpen}
            onOpenChange={setPermissionsOpen}
          />
        )}
      </CardContent>
    </Card>
  );
};
