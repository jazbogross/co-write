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
        onRepositoryCreated(data);
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