
import React from "react";
import { DeltaTextEditor } from "@/components/DeltaTextEditor";
import { SaveVersionDialog } from "@/components/editor/SaveVersionDialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface ScriptEditorProps {
  scriptId: string;
  script: {
    title: string;
    folder_name: string;
  } | null;
  isAdmin: boolean;
  handleCommitToGithub: (content: string) => Promise<boolean>;
  handleSaveVersion: (content: string) => void;
  pendingSuggestionsCount: number;
  hasPendingSuggestions: boolean;
  saveVersion: (versionName: string) => void;
  isVersionDialogOpen: boolean;
  setIsVersionDialogOpen: (isOpen: boolean) => void;
  isSavingVersion: boolean;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  scriptId,
  script,
  isAdmin,
  handleCommitToGithub,
  handleSaveVersion,
  pendingSuggestionsCount,
  hasPendingSuggestions,
  saveVersion,
  isVersionDialogOpen,
  setIsVersionDialogOpen,
  isSavingVersion
}) => {
  return (
    <div className="container min-w-screen">
      <Card>
        <CardHeader>
          <CardTitle>{script?.title || "Script"}</CardTitle>
          <CardDescription>
            {isAdmin ? "Edit your script" : "Suggest changes to this script"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DeltaTextEditor 
            scriptId={scriptId} 
            isAdmin={isAdmin}
            onCommitToGithub={handleCommitToGithub}
            onSaveVersion={handleSaveVersion}
            pendingSuggestionsCount={pendingSuggestionsCount}
            hasPendingSuggestions={hasPendingSuggestions}
          />
        </CardContent>
      </Card>
      
      <SaveVersionDialog
        open={isVersionDialogOpen}
        onOpenChange={setIsVersionDialogOpen}
        onSave={saveVersion}
        isSaving={isSavingVersion}
      />
    </div>
  );
};
