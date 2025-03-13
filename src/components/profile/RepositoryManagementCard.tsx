
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Repository } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { RepositoryListItem } from "./RepositoryListItem";
import { RepositoryPermissionsDialog } from "./RepositoryPermissionsDialog";

export const RepositoryManagementCard = () => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRepos = async () => {
      setIsLoading(true);
      try {
        // Fetch user scripts instead of github_repositories since we removed that table
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
      } finally {
        setIsLoading(false);
      }
    };

    fetchRepos();
  }, []);

  const handleInstallationCheck = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return;

      // Fetch repositories directly from scripts table
      const { data, error } = await supabase
        .from("scripts")
        .select("id, title, created_at, admin_id, github_repo, github_owner, is_private")
        .eq("admin_id", user.user.id)
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
      console.error("Error checking installation:", error);
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
        {isLoading ? (
          <p>Loading repositories...</p>
        ) : repositories.length === 0 ? (
          <p>No repositories found. Create a script to get started.</p>
        ) : (
          <div className="space-y-4">
            {repositories.map((repo) => (
              <RepositoryListItem
                key={repo.id}
                repository={repo}
                onOpenPermissions={() => handleOpenPermissions(repo)}
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
