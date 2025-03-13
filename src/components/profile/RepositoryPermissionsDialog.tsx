
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from '../profile/types';

interface RepositoryPermissionsDialogProps {
  repositoryId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPermissionsUpdated: () => void;
}

export const RepositoryPermissionsDialog: React.FC<RepositoryPermissionsDialogProps> = ({
  repositoryId,
  open,
  onOpenChange,
  onPermissionsUpdated,
}) => {
  const [email, setEmail] = useState("");
  const [permission, setPermission] = useState<string>("read");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<any[]>([]);

  useEffect(() => {
    if (open) {
      fetchUsers();
      fetchPermissions();
    }
  }, [open, repositoryId]);

  const fetchUsers = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username');
      
      if (data) {
        setUsers(data.map(user => ({
          id: user.id,
          username: user.username || 'No username'
        })));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data } = await supabase
        .from('repository_permissions')
        .select(`
          id, 
          repository_id, 
          user_id, 
          permission_type,
          profiles (
            username
          )
        `)
        .eq('repository_id', repositoryId);
      
      if (data) {
        setPermissions(data);
      }
    } catch (error) {
      console.error('Error fetching permissions:', error);
    }
  };

  const handleAddPermission = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', email)
        .single();

      if (userError || !userData) {
        toast.error('User not found');
        return;
      }

      // Check if permission already exists
      const { data: existingPermission } = await supabase
        .from('repository_permissions')
        .select('id')
        .eq('repository_id', repositoryId)
        .eq('user_id', userData.id)
        .single();

      if (existingPermission) {
        // Update existing permission
        const { error: updateError } = await supabase
          .from('repository_permissions')
          .update({ permission_type: permission })
          .eq('id', existingPermission.id);

        if (updateError) throw updateError;
        toast.success('Permission updated successfully');
      } else {
        // Create new permission
        const { error: insertError } = await supabase
          .from('repository_permissions')
          .insert({
            repository_id: repositoryId,
            user_id: userData.id,
            permission_type: permission,
          });

        if (insertError) throw insertError;
        toast.success('Permission added successfully');
      }

      // Clear form and refresh permissions
      setEmail('');
      fetchPermissions();
      onPermissionsUpdated();
    } catch (error) {
      console.error('Error adding permission:', error);
      toast.error('Failed to add permission');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from('repository_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;
      toast.success('Permission removed successfully');
      fetchPermissions();
      onPermissionsUpdated();
    } catch (error) {
      console.error('Error removing permission:', error);
      toast.error('Failed to remove permission');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Access</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email or Username</Label>
            <Input
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email or username"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="permission">Permission Level</Label>
            <Select value={permission} onValueChange={setPermission}>
              <SelectTrigger id="permission">
                <SelectValue placeholder="Select permission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="write">Write</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleAddPermission} disabled={loading} className="w-full">
            {loading ? 'Adding...' : 'Add User'}
          </Button>

          {permissions.length > 0 && (
            <div className="border rounded-md mt-4 p-2">
              <h3 className="text-sm font-medium mb-2">Current Permissions</h3>
              <div className="space-y-2">
                {permissions.map((perm) => (
                  <div key={perm.id} className="flex justify-between items-center p-2 bg-background border rounded-md">
                    <div>
                      <span className="text-sm font-medium">
                        {perm.profiles?.username || 'Unknown user'}
                      </span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({perm.permission_type})
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRemovePermission(perm.id)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
