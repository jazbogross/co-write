import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderPlus, Github, Lock, LockOpen } from "lucide-react";
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
  const { toast } = useToast();

  const handleCreateRepository = async () => {
    try {
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
        setRepositories([...repositories, data]);
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
                  {repo.is_private ? (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <LockOpen className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}