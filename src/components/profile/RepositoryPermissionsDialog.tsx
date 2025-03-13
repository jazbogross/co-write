
import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Repository, Permission, User } from "./types";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface RepositoryPermissionsDialogProps {
  repository: Repository;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RepositoryPermissionsDialog = ({
  repository,
  open,
  onOpenChange,
}: RepositoryPermissionsDialogProps) => {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [permissionType, setPermissionType] = useState<"view" | "edit">("view");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (open) {
      loadPermissions();
      loadUsers();
    }
  }, [open, repository.id]);

  const loadPermissions = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("repository_permissions")
        .select("*, profiles:user_id(*)")
        .eq("repository_id", repository.id);

      if (error) throw error;

      // Transform to Permission type with user info
      const formattedPermissions = data.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        repository_id: p.repository_id,
        permission_type: p.permission_type as "view" | "edit" | "admin",
        user: p.profiles ? {
          id: p.profiles.id || '',
          username: p.profiles.username || 'Unknown User'
        } : undefined
      }));

      setPermissions(formattedPermissions);
    } catch (error) {
      console.error("Error loading permissions:", error);
      toast.error("Failed to load repository permissions");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username");

      if (error) throw error;

      setUsers(data.map(u => ({
        id: u.id,
        username: u.username
      })));
    } catch (error) {
      console.error("Error loading users:", error);
    }
  };

  const handleAddPermission = async () => {
    if (!selectedUser) return;

    try {
      const { error } = await supabase.from("repository_permissions").insert({
        repository_id: repository.id,
        user_id: selectedUser,
        permission_type: permissionType,
      });

      if (error) throw error;

      toast.success("User permission added successfully");
      loadPermissions();
      setSelectedUser("");
    } catch (error) {
      console.error("Error adding permission:", error);
      toast.error("Failed to add user permission");
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      const { error } = await supabase
        .from("repository_permissions")
        .delete()
        .eq("id", permissionId);

      if (error) throw error;

      toast.success("Permission removed successfully");
      loadPermissions();
    } catch (error) {
      console.error("Error removing permission:", error);
      toast.error("Failed to remove permission");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Manage Access to {repository.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <select
                className="col-span-2 px-3 py-2 border rounded"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username || user.id}
                  </option>
                ))}
              </select>
              <select
                className="px-3 py-2 border rounded"
                value={permissionType}
                onChange={(e) => setPermissionType(e.target.value as "view" | "edit")}
              >
                <option value="view">View</option>
                <option value="edit">Edit</option>
              </select>
              <Button onClick={handleAddPermission}>Add</Button>
            </div>
          </div>

          <div className="border rounded">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Permission
                  </th>
                  <th className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4">
                      Loading permissions...
                    </td>
                  </tr>
                ) : permissions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4">
                      No permissions found
                    </td>
                  </tr>
                ) : (
                  permissions.map((permission) => (
                    <tr key={permission.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {permission.user?.username || "Unknown User"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap capitalize">
                        {permission.permission_type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleRemovePermission(permission.id)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
