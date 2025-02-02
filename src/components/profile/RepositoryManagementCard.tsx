import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderPlus, Github, Lock, LockOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

  const handleCreateRepository = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('github_repositories')
        .insert({
          name: 'New Repository',
          owner: user.email?.split('@')[0] || 'user',
          is_private: false,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setRepositories([data, ...repositories]);
        toast({
          title: "Success",
          description: "Repository created successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create repository",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
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
            <Button
              variant="outline"
              onClick={handleCreateRepository}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Create New Repository
            </Button>
          </div>
          
          <div className="space-y-2">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  <span>{repo.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePrivacy(repo)}
                    disabled={loading}
                  >
                    {repo.is_private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <LockOpen className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRepository(repo.id)}
                    disabled={loading}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}