import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2 } from "lucide-react";

interface Script {
  id: string;
  title: string;
  created_at: string;
  is_private: boolean;
}

interface ScriptItemProps {
  script: Script;
  onEdit: (script: Script) => void;
  onDelete: (scriptId: string) => void;
  onTogglePrivacy: (scriptId: string, currentPrivacy: boolean) => void;
  onNavigate: (scriptId: string) => void;
}

export function ScriptItem({ 
  script, 
  onEdit, 
  onDelete, 
  onTogglePrivacy,
  onNavigate 
}: ScriptItemProps) {
  return (
    <Card className="p-4">
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
              onCheckedChange={() => onTogglePrivacy(script.id, script.is_private)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => onEdit(script)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onDelete(script.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => onNavigate(script.id)}
            >
              Edit
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}