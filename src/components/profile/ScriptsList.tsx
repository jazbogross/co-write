import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

type Script = {
  id: string;
  title: string;
  created_at: string;
};

export const ScriptsList = ({ scripts: initialScripts }: { scripts: Script[] }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [scripts, setScripts] = useState<Script[]>(initialScripts);

  const createNewScript = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("scripts")
        .insert([
          {
            title: "New Script",
            admin_id: user.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setScripts([data, ...scripts]);
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

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Button onClick={createNewScript}>Create New Script</Button>
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
              <Button
                variant="outline"
                onClick={() => navigate(`/scripts/${script.id}`)}
              >
                Edit
              </Button>
            </div>
          </Card>
        ))}
        {scripts.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No scripts created yet
          </p>
        )}
      </div>
    </div>
  );
};