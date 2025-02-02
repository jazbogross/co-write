import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreateRepositoryButton } from "./CreateRepositoryButton";
import { RepositoryListItem } from "./RepositoryListItem";

interface Repository {
  id: string;
  name: string;
  owner: string;
  is_private: boolean;
}

export function RepositoryManagementCard() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const { data, error } = await supabase
        .from('github_repositories')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRepositories(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load repositories",
        variant: "destructive",
      });
    }
  };

  const handleTogglePrivacy = async (repo: Repository) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('github_repositories')
        .update({ is_private: !repo.is_private })
        .eq('id', repo.id)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setRepositories(repositories.map(r => 
          r.id === repo.id ? data : r
        ));
        toast({
          title: "Success",
          description: `Repository is now ${data.is_private ? 'private' : 'public'}`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update repository privacy",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRepository = async (id: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('github_repositories')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setRepositories(repositories.filter(repo => repo.id !== id));
      toast({
        title: "Success",
        description: "Repository deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete repository",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Repository Management</CardTitle>
        <CardDescription>
          Manage your GitHub repositories
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <CreateRepositoryButton
              onRepositoryCreated={(repo) => setRepositories([repo, ...repositories])}
            />
          </div>
          
          <div className="space-y-2">
            {repositories.map((repo) => (
              <RepositoryListItem
                key={repo.id}
                repository={repo}
                onTogglePrivacy={handleTogglePrivacy}
                onDelete={handleDeleteRepository}
                loading={loading}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}