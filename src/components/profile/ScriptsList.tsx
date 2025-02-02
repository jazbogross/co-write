import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2 } from "lucide-react";

type Script = {
  id: string;
  title: string;
  created_at: string;
  is_private: boolean;
};

export const ScriptsList = ({ scripts: initialScripts }: { scripts: Script[] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [isNewScriptDialogOpen, setIsNewScriptDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const createNewScript = async () => {
    if (!newTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script title",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("scripts")
        .insert([
          {
            title: newTitle,
            admin_id: user.id,
            is_private: false,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setScripts([data, ...scripts]);
        setNewTitle("");
        setIsNewScriptDialogOpen(false);
        toast({
          title: "Success",
          description: "New script created",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create script",
        variant: "destructive",
      });
    }
  };

  const handleRename = async () => {
    if (!selectedScript || !newTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script title",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("scripts")
        .update({ title: newTitle })
        .eq("id", selectedScript.id);

      if (error) throw error;

      setScripts(scripts.map(script => 
        script.id === selectedScript.id 
          ? { ...script, title: newTitle }
          : script
      ));
      
      setIsRenameDialogOpen(false);
      setSelectedScript(null);
      setNewTitle("");
      
      toast({
        title: "Success",
        description: "Script renamed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to rename script",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (scriptId: string) => {
    try {
      const { error } = await supabase
        .from("scripts")
        .delete()
        .eq("id", scriptId);

      if (error) throw error;

      setScripts(scripts.filter(script => script.id !== scriptId));
      
      toast({
        title: "Success",
        description: "Script deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete script",
        variant: "destructive",
      });
    }
  };

  const togglePrivacy = async (scriptId: string, currentPrivacy: boolean) => {
    try {
      const { error } = await supabase
        .from("scripts")
        .update({ is_private: !currentPrivacy })
        .eq("id", scriptId);

      if (error) throw error;

      setScripts(scripts.map(script => 
        script.id === scriptId 
          ? { ...script, is_private: !script.is_private }
          : script
      ));
      
      toast({
        title: "Success",
        description: `Script is now ${!currentPrivacy ? 'private' : 'public'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update script privacy",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Button onClick={() => {
          setNewTitle("");
          setIsNewScriptDialogOpen(true);
        }}>
          Create New Script
        </Button>
      </div>
      <div className="space-y-4">
        {scripts.map((script) => (
          <Card key={script.id} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">{script.title}</h3>
                <p className="text-sm text-muted-foreground">
                  Created: {new Date(script.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {script.is_private ? 'Private' : 'Public'}
                  </span>
                  <Switch
                    checked={!script.is_private}
                    onCheckedChange={() => togglePrivacy(script.id, script.is_private)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setSelectedScript(script);
                      setNewTitle(script.title);
                      setIsRenameDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleDelete(script.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate(`/scripts/${script.id}`)}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
        {scripts.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No scripts created yet
          </p>
        )}
      </div>

      {/* New Script Dialog */}
      <Dialog open={isNewScriptDialogOpen} onOpenChange={setIsNewScriptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Script</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter script title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewScriptDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createNewScript}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Script</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter new title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Rename</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};