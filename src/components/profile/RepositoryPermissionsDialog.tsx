
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Repository } from './types';
import { toast } from 'sonner';

// Define interface for props
export interface RepositoryPermissionsDialogProps {
  repositoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repository: Repository;
}

export const RepositoryPermissionsDialog: React.FC<RepositoryPermissionsDialogProps> = ({
  repositoryId,
  repository,
  open,
  onOpenChange,
}) => {
  const [email, setEmail] = useState('');
  const [permissionType, setPermissionType] = useState<'view' | 'edit' | 'admin'>('view');
  const [isLoading, setIsLoading] = useState(false);
  const [existingPermissions, setExistingPermissions] = useState<any[]>([]);
  
  // Fetch existing permissions when dialog opens
  useEffect(() => {
    if (open) {
      fetchPermissions();
    }
  }, [open]);
  
  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('repository_permissions')
        .select(`
          id,
          permission_type,
          user_id,
          profiles:user_id (
            username
          )
        `)
        .eq('repository_id', repositoryId);
      
      if (error) throw error;
      
      setExistingPermissions(data || []);
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };
  
  const addPermission = async () => {
    if (!email) {
      toast.error('Please enter an email');
      return;
    }
    
    setIsLoading(true);
    try {
      // First find the user by email
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', email);
      
      if (userError) throw userError;
      
      if (!users || users.length === 0) {
        toast.error(`User with email ${email} not found`);
        return;
      }
      
      const userId = users[0].id;
      const username = users[0].username;
      
      // Check if permission already exists
      const { data: existingData } = await supabase
        .from('repository_permissions')
        .select('id')
        .eq('repository_id', repositoryId)
        .eq('user_id', userId);
      
      if (existingData && existingData.length > 0) {
        // Update existing permission
        const { error: updateError } = await supabase
          .from('repository_permissions')
          .update({ permission_type: permissionType })
          .eq('id', existingData[0].id);
        
        if (updateError) throw updateError;
        
        toast.success(`Updated permissions for ${username}`);
      } else {
        // Create new permission
        const { error: insertError } = await supabase
          .from('repository_permissions')
          .insert({
            repository_id: repositoryId,
            user_id: userId,
            permission_type: permissionType
          });
        
        if (insertError) throw insertError;
        
        toast.success(`Added ${username} with ${permissionType} permissions`);
      }
      
      // Refresh permissions list
      fetchPermissions();
      setEmail('');
    } catch (error) {
      console.error('Error adding permission:', error);
      toast.error('Failed to add permission');
    } finally {
      setIsLoading(false);
    }
  };
  
  const removePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('repository_permissions')
        .delete()
        .eq('id', permissionId);
      
      if (error) throw error;
      
      toast.success('Permission removed');
      fetchPermissions();
    } catch (error) {
      console.error('Error removing permission:', error);
      toast.error('Failed to remove permission');
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Manage Permissions: {repository.name}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Add User</h3>
            <div className="flex space-x-2">
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="flex-1"
              />
              <Select 
                value={permissionType} 
                onValueChange={(value) => setPermissionType(value as 'view' | 'edit' | 'admin')}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Permission" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                size="sm" 
                onClick={addPermission} 
                disabled={isLoading}
              >
                Add
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Current Permissions</h3>
            <div className="space-y-2">
              {existingPermissions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No permissions added</p>
              ) : (
                existingPermissions.map((permission) => (
                  <div key={permission.id} className="flex items-center justify-between">
                    <div>
                      <span className="text-sm">
                        {permission.profiles?.username || 'Unknown user'}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({permission.permission_type})
                      </span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => removePermission(permission.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
