
import React, { useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { loadContent } from '@/utils/saveLineUtils';
import Delta from 'quill-delta';
import { useEditorContent } from '@/hooks/useEditorContent';
import { EditorContent } from '@/components/editor/EditorContent';
import { EditorActions } from '@/components/editor/EditorActions';
import { SaveVersionDialog } from './editor/SaveVersionDialog';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';

interface DeltaEditorProps {
  scriptId: string;
  isAdmin: boolean;
}

export const DeltaEditor: React.FC<DeltaEditorProps> = ({ scriptId, isAdmin }) => {
  const {
    content,
    setContent,
    userId,
    isLoading,
    hasDraft,
    setHasDraft,
    quillRef
  } = useEditorContent(scriptId, isAdmin);
  
  const [showSaveVersionDialog, setShowSaveVersionDialog] = useState(false);
  
  const { 
    submitAsAdmin, 
    submitAsDraft, 
    submitAsSuggestion,
    saveVersion,
    isSaving 
  } = useSubmitEdits({ 
    scriptId, 
    isAdmin, 
    userId 
  });
  
  const handleChange = (value: any) => {
    // This is intentionally empty as changes are captured by the quill reference
  };
  
  const handleSave = async () => {
    if (!quillRef.current || !userId) return;
    
    try {
      const currentContent = quillRef.current.getEditor().getContents();
      
      if (isAdmin) {
        await submitAsAdmin(currentContent);
      } else {
        await submitAsDraft(currentContent);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('An error occurred while saving');
    }
  };
  
  const handleSaveVersion = async (versionName: string) => {
    if (!quillRef.current || !userId || !isAdmin) return;
    
    try {
      const currentContent = quillRef.current.getEditor().getContents();
      await saveVersion(currentContent, versionName);
      setShowSaveVersionDialog(false);
    } catch (error) {
      console.error('Error saving version:', error);
      toast.error('An error occurred while saving version');
    }
  };
  
  const handleSubmitSuggestion = async () => {
    if (!quillRef.current || !userId || isAdmin) return;
    
    try {
      const suggestedContent = quillRef.current.getEditor().getContents();
      
      const { data } = await supabase
        .from('script_content')
        .select('content_delta')
        .eq('script_id', scriptId)
        .single();
      
      if (!data?.content_delta) {
        toast.error('Could not load original content to compare');
        return;
      }
      
      const contentDeltaData = typeof data.content_delta === 'string' 
        ? JSON.parse(data.content_delta) 
        : data.content_delta;
        
      const originalDelta = new Delta(contentDeltaData.ops || []);
      
      const suggestedDelta = new Delta(suggestedContent.ops || []);
      
      const diffDelta = originalDelta.diff(suggestedDelta);
      
      if (diffDelta.ops?.length <= 1) {
        toast.info('No changes detected');
        return;
      }
      
      // Create a single line data element with the full content
      const lineData = [{
        uuid: scriptId,
        lineNumber: 1,
        content: suggestedContent,
        originalAuthor: userId,
        editedBy: [],
        hasDraft: false
      }];
      
      await submitAsSuggestion(lineData, originalDelta);
      
      setHasDraft(false);
      
      // Reload content after suggestion is submitted
      const result = await loadContent(scriptId);
      if (result) {
        setContent(result);
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    }
  };
  
  if (isLoading) {
    return <div>Loading editor...</div>;
  }
  
  return (
    <div className="space-y-0">
      <EditorActions 
        isAdmin={isAdmin}
        isSaving={isSaving}
        hasDraft={hasDraft}
        handleSave={handleSave}
        handleSubmitSuggestion={handleSubmitSuggestion}
        onSaveVersion={() => setShowSaveVersionDialog(true)}
      />

      <EditorContent 
        content={content} 
        quillRef={quillRef} 
        handleChange={handleChange} 
      />
      
      <SaveVersionDialog
        open={showSaveVersionDialog}
        onOpenChange={setShowSaveVersionDialog}
        onSave={handleSaveVersion}
        isSaving={isSaving}
      />
    </div>
  );
};
