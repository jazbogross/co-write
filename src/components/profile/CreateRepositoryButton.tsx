
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CreateRepositoryButtonProps {
  onRepositoryCreated: (repository: any) => void;
}

export function CreateRepositoryButton({ onRepositoryCreated }: CreateRepositoryButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleCreateRepository = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in to create a repository");
        return;
      }

      // Get the GitHub App installation ID
      const installationId = localStorage.getItem('github_app_installation_id');
      if (!installationId) {
        toast.error("Please install the GitHub App first");
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
        toast.success("Repository created successfully");
      }
    } catch (error) {
      console.error('Error creating repository:', error);
      toast.error("Failed to create repository");
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
