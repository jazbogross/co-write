
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Plus, MoreVertical, Users, Trash, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { CreateRepositoryButton } from './CreateRepositoryButton';
import { RepositoryListItem } from './RepositoryListItem';
import { RepositoryPermissionsDialog } from './RepositoryPermissionsDialog';
import { Repository } from './types';
import { toast } from 'sonner';

interface RepositoryManagementCardProps {
  userId: string;
}

export const RepositoryManagementCard: React.FC<RepositoryManagementCardProps> = ({ userId }) => {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRepo, setSelectedRepo] = useState<Repository | null>(null);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  
  useEffect(() => {
    fetchRepositories();
  }, [userId]);
  
  const fetchRepositories = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('scripts')
        .select('*')
        .eq('admin_id', userId);
      
      if (error) throw error;
      
      const repos: Repository[] = data.map(repo => ({
        id: repo.id,
        name: repo.title,
        owner: userId,
        is_private: repo.is_private || false,
        created_at: repo.created_at
      }));
      
      setRepositories(repos);
    } catch (error) {
      console.error('Error fetching repositories:', error);
      toast.error('Failed to load repositories');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteRepository = async (repositoryId: string) => {
    if (!confirm('Are you sure you want to delete this repository? This action cannot be undone.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('scripts')
        .delete()
        .eq('id', repositoryId);
      
      if (error) throw error;
      
      toast.success('Repository deleted successfully');
      fetchRepositories();
    } catch (error) {
      console.error('Error deleting repository:', error);
      toast.error('Failed to delete repository');
    }
  };
  
  const openPermissionsDialog = (repository: Repository) => {
    setSelectedRepo(repository);
    setIsPermissionsDialogOpen(true);
  };
  
  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Your Repositories</CardTitle>
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" onClick={fetchRepositories}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <CreateRepositoryButton userId={userId} onSuccess={fetchRepositories} />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4 text-muted-foreground">Loading repositories...</div>
        ) : repositories.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <p>You don't have any repositories yet.</p>
            <p className="mt-2">Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {repositories.map(repo => (
              <div key={repo.id} className="flex items-center justify-between">
                <RepositoryListItem repository={repo} />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openPermissionsDialog(repo)}>
                      <Users className="h-4 w-4 mr-2" />
                      Manage Access
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleDeleteRepository(repo.id)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Repository
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      {selectedRepo && (
        <RepositoryPermissionsDialog
          repositoryId={selectedRepo.id}
          repository={selectedRepo}
          open={isPermissionsDialogOpen}
          onOpenChange={setIsPermissionsDialogOpen}
        />
      )}
    </Card>
  );
};
