
import { useParams } from "react-router-dom";
import { useScriptData } from "@/hooks/script/useScriptData";
import { useGithubIntegration } from "@/hooks/script/useGithubIntegration";
import { usePendingSuggestions } from "@/hooks/script/usePendingSuggestions";
import { ScriptEditor } from "@/components/script/ScriptEditor";

const ScriptEdit = () => {
  const { id } = useParams();
  const { script, isAdmin, loading, githubToken, userId } = useScriptData(id);
  const { 
    handleCommitToGithub, 
    handleSaveVersion, 
    saveVersion, 
    isVersionDialogOpen, 
    setIsVersionDialogOpen, 
    isSavingVersion, 
    currentContent 
  } = useGithubIntegration(id, githubToken);
  const { pendingSuggestionsCount, hasPendingSuggestions } = usePendingSuggestions(id, isAdmin);

  const handleSaveVersionWithUser = (versionName: string) => {
    saveVersion(versionName, script, userId);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!script || !id) {
    return null;
  }

  return (
    <ScriptEditor
      scriptId={id}
      script={script}
      isAdmin={isAdmin}
      handleCommitToGithub={handleCommitToGithub}
      handleSaveVersion={handleSaveVersion}
      pendingSuggestionsCount={pendingSuggestionsCount}
      hasPendingSuggestions={hasPendingSuggestions}
      saveVersion={handleSaveVersionWithUser}
      isVersionDialogOpen={isVersionDialogOpen}
      setIsVersionDialogOpen={setIsVersionDialogOpen}
      isSavingVersion={isSavingVersion}
    />
  );
};

export default ScriptEdit;
