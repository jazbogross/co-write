import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Permission {
  id: string;
  user_id: string;
  permission_type: string;
  user_email?: string;
}

interface RepositoryPermissionsDialogProps {
  repositoryId: string;
  repositoryName: string;
}

export function RepositoryPermissionsDialog({ repositoryId, repositoryName }: RepositoryPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newPermissionType, setNewPermissionType] = useState("read");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const loadPermissions = async () => {
    try {
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('repository_permissions')
        .select(`
          id,
          user_id,
          permission_type,
          profiles:profiles(email)
        `)
        .eq('repository_id', repositoryId);

      if (permissionsError) throw permissionsError;

      const formattedPermissions = permissionsData.map(p => ({
        ...p,
        user_email: p.profiles?.email
      }));

      setPermissions(formattedPermissions);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load permissions",
        variant: "destructive",
      });
    }
  };

  const handleAddPermission = async () => {
    try {
      setLoading(true);
      
      // First, get the user_id from the email
      const { data: userData, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', newUserEmail)
        .single();

      if (userError) throw userError;

      // Then add the permission
      const { data, error } = await supabase
        .from('repository_permissions')
        .insert({
          repository_id: repositoryId,
          user_id: userData.id,
          permission_type: newPermissionType
        })
        .select(`
          id,
          user_id,
          permission_type,
          profiles:profiles(email)
        `)
        .single();

      if (error) throw error;

      setPermissions([...permissions, {
        ...data,
        user_email: data.profiles?.email
      }]);
      
      setNewUserEmail("");
      toast({
        title: "Success",
        description: "Permission added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add permission",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePermission = async (permissionId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('repository_permissions')
        .delete()
        .eq('id', permissionId);

      if (error) throw error;

      setPermissions(permissions.filter(p => p.id !== permissionId));
      toast({
        title: "Success",
        description: "Permission removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove permission",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog onOpenChange={(open) => open && loadPermissions()}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Shield className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Permissions - {repositoryName}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="User email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
            />
            <Select
              value={newPermissionType}
              onValueChange={setNewPermissionType}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="read">Read</SelectItem>
                <SelectItem value="write">Write</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleAddPermission}
              disabled={loading || !newUserEmail}
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-2">
            {permissions.map((permission) => (
              <div
                key={permission.id}
                className="flex items-center justify-between p-2 border rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <span>{permission.user_email}</span>
                  <span className="text-sm text-muted-foreground">
                    ({permission.permission_type})
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePermission(permission.id)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}