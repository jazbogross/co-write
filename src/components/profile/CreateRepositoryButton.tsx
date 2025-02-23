
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CreateRepositoryButtonProps {
  onRepositoryCreated: (repository: any) => void;
}

export function CreateRepositoryButton({ onRepositoryCreated }: CreateRepositoryButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCreateRepository = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get the GitHub App installation ID
      const installationId = localStorage.getItem('github_app_installation_id');
      if (!installationId) {
        toast({
          title: "Error",
          description: "Please install the GitHub App first",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .functions.invoke('create-github-repo', {
          body: {
            scriptName: 'New Repository',
            originalCreator: user.email?.split('@')[0] || 'user',
            coAuthors: [],
            isPrivate: false,
            installationId: installationId
          }
        });

      if (error) throw error;

      if (data) {
        onRepositoryCreated(data);
        toast({
          title: "Success",
          description: "Repository created successfully",
        });
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      toast({
        title: "Error",
        description: "Failed to create repository",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      onClick={handleCreateRepository}
      disabled={loading}
      className="w-full sm:w-auto"
    >
      <FolderPlus className="mr-2 h-4 w-4" />
      Create New Repository
    </Button>
  );
}
