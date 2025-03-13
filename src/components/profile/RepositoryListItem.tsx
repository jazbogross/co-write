
import { Button } from "@/components/ui/button";
import { Github, Lock, LockOpen, Trash2, Users } from "lucide-react";
import { Repository } from "@/types/repository";

interface RepositoryListItemProps {
  repository: Repository;
  onTogglePrivacy: (repo: Repository) => void;
  onDelete: (id: string) => void;
  onOpenPermissions: (repo: Repository) => void;
  loading: boolean;
}

export function RepositoryListItem({ 
  repository, 
  onTogglePrivacy, 
  onDelete, 
  onOpenPermissions,
  loading 
}: RepositoryListItemProps) {
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-2">
        <Github className="h-5 w-5" />
        <span>{repository.name}</span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onTogglePrivacy(repository)}
          disabled={loading}
        >
          {repository.is_private ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <LockOpen className="h-4 w-4 text-muted-foreground" />
          )}
        </Button>
        {repository.is_private && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenPermissions(repository)}
            disabled={loading}
          >
            <Users className="h-4 w-4 text-muted-foreground" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(repository.id)}
          disabled={loading}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
