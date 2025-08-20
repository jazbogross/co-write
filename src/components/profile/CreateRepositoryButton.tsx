
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

interface CreateRepositoryButtonProps {
  onRepositoryCreated: () => Promise<void>;
}

export const CreateRepositoryButton: React.FC<CreateRepositoryButtonProps> = ({ onRepositoryCreated }) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [repositoryName, setRepositoryName] = useState('');
  const [isPrivate, setIsPrivate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const createRepository = async () => {
    if (!repositoryName.trim()) {
      toast.error('Please enter a repository name');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to create a repository');
      return;
    }

    setIsCreating(true);
    try {
      // Create the repository in the database
      const { data, error } = await supabase
        .from('scripts')
        .insert({
          title: repositoryName.trim(),
          admin_id: user.id,
          is_private: isPrivate,
          content: { ops: [{ insert: '\n' }] }
        })
        .select('id')
        .single();

      if (error) throw error;

      toast.success('Repository created successfully');
      setRepositoryName('');
      setIsPrivate(true);
      setIsOpen(false);
      await onRepositoryCreated();
    } catch (error) {
      console.error('Error creating repository:', error);
      toast.error('Failed to create repository');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="default" size="sm">
        <Plus className="h-4 w-4 mr-1" />
        New Repository
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Repository</DialogTitle>
            <DialogDescription>
              Create a new repository for your scripts. Private repositories are only visible to you and users you invite.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Repository Name</Label>
              <Input
                id="name"
                placeholder="My Awesome Script"
                value={repositoryName}
                onChange={e => setRepositoryName(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="private"
                checked={isPrivate}
                onCheckedChange={setIsPrivate}
              />
              <Label htmlFor="private">Private Repository</Label>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={createRepository}
              disabled={isCreating || !repositoryName.trim()}
            >
              {isCreating ? 'Creating...' : 'Create Repository'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
