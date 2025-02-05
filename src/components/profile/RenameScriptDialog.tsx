import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Script {
  id: string;
  title: string;
}

interface RenameScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  script: Script | null;
  onScriptRenamed: (scriptId: string, newTitle: string) => void;
}

export function RenameScriptDialog({ 
  open, 
  onOpenChange, 
  script, 
  onScriptRenamed 
}: RenameScriptDialogProps) {
  const [newTitle, setNewTitle] = useState(script?.title || "");
  const [isRenaming, setIsRenaming] = useState(false);
  const { toast } = useToast();

  const handleRename = async () => {
    if (!script || !newTitle.trim()) {
      toast({
        title: "Error",
        description: "Please enter a script title",
        variant: "destructive",
      });
      return;
    }

    setIsRenaming(true);
    try {
      // First update the script title in the database
      const { error: dbError } = await supabase
        .from("scripts")
        .update({ title: newTitle })
        .eq("id", script.id);

      if (dbError) throw dbError;

      // Then update the GitHub repository structure
      const { error: functionError } = await supabase.functions.invoke('rename-script', {
        body: {
          scriptId: script.id,
          oldTitle: script.title,
          newTitle: newTitle,
        }
      });

      if (functionError) throw functionError;

      onScriptRenamed(script.id, newTitle);
      onOpenChange(false);
      
      toast({
        title: "Success",
        description: "Script renamed successfully",
      });
    } catch (error: any) {
      console.error('Error renaming script:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to rename script",
        variant: "destructive",
      });
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleRename} disabled={isRenaming}>
            {isRenaming ? 'Renaming...' : 'Rename'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}