
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SaveVersionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (versionName: string) => void;
  isSaving: boolean;
}

export function SaveVersionDialog({
  open,
  onOpenChange,
  onSave,
  isSaving
}: SaveVersionDialogProps) {
  const [versionName, setVersionName] = useState("");

  const handleSave = () => {
    onSave(versionName);
    setVersionName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Save Version</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <Label htmlFor="versionName">Version Name</Label>
          <Input
            id="versionName"
            placeholder="Enter a name for this version"
            value={versionName}
            onChange={(e) => setVersionName(e.target.value)}
          />
          <p className="text-sm text-muted-foreground">
            This version will be saved as a separate file in the repository's versions folder.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !versionName.trim()}>
            {isSaving ? 'Saving...' : 'Save Version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
