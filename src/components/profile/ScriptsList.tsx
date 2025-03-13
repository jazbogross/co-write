import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CreateScriptDialog } from "./CreateScriptDialog";
import { RenameScriptDialog } from "./RenameScriptDialog";
import { ScriptItem } from "./ScriptItem";
import { Script } from "@/types/repository";

export const ScriptsList = ({ scripts: initialScripts }: { scripts: Script[] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [isNewScriptDialogOpen, setIsNewScriptDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);

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

  const handleScriptRenamed = (scriptId: string, newTitle: string) => {
    setScripts(scripts.map(script => 
      script.id === scriptId 
        ? { ...script, title: newTitle }
        : script
    ));
    setSelectedScript(null);
  };

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Button onClick={() => setIsNewScriptDialogOpen(true)}>
          Create New Script
        </Button>
      </div>

      <div className="space-y-4">
        {scripts.map((script) => (
          <ScriptItem
            key={script.id}
            script={script}
            onEdit={(script) => {
              setSelectedScript(script);
              setIsRenameDialogOpen(true);
            }}
            onDelete={handleDelete}
            onTogglePrivacy={togglePrivacy}
            onNavigate={(id) => navigate(`/scripts/${id}`)}
          />
        ))}
        {scripts.length === 0 && (
          <p className="text-center text-muted-foreground py-4">
            No scripts created yet
          </p>
        )}
      </div>

      <CreateScriptDialog
        open={isNewScriptDialogOpen}
        onOpenChange={setIsNewScriptDialogOpen}
        onScriptCreated={(script) => setScripts([script, ...scripts])}
      />

      <RenameScriptDialog
        open={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        script={selectedScript}
        onScriptRenamed={handleScriptRenamed}
      />
    </div>
  );
};
