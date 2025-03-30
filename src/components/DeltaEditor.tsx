
import React, { useState, useEffect } from 'react';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { loadContent } from '@/utils/deltaUtils';
import Delta from 'quill-delta';
import { useEditorContent } from '@/hooks/useEditorContent';
import { EditorContent } from '@/components/editor/EditorContent';
import { EditorActions } from '@/components/editor/EditorActions';
import { SaveVersionDialog } from './editor/SaveVersionDialog';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { ensureDeltaContent, toDelta } from '@/utils/deltaUtils';

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
  const [lastChangeSource, setLastChangeSource] = useState<string | null>(null);
  
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
  
  // Use a debounced handler for Quill changes
  const handleChange = (value: string, delta: any, source: string, editor: any) => {
    // Only process user changes to avoid loops
    if (source === 'user') {
      setLastChangeSource('user');
      // No need to update content here as it's captured by the quill reference
    }
  };
  
  const handleChangeSelection = (range: any, source: string, editor: any) => {
    // Intentionally empty - handles selection changes if needed in the future
  };
  
  const handleEditorClick = (event: React.MouseEvent) => {
    // Intentionally empty - handles editor clicks if needed in the future
  };
  
  const handleSave = async () => {
    if (!quillRef.current || !userId) return;
    
    try {
      const currentContent = quillRef.current.getEditor().getContents();
      const contentAsContent = ensureDeltaContent(currentContent);
      
      if (isAdmin) {
        await submitAsAdmin(contentAsContent);
      } else {
        await submitAsDraft(contentAsContent);
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
      const contentAsContent = ensureDeltaContent(currentContent);
      await saveVersion(contentAsContent, versionName);
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
        .from('scripts')
        .select('content')
        .eq('id', scriptId)
        .single();
      
      if (!data?.content) {
        toast.error('Could not load original content to compare');
        return;
      }
      
      const contentDeltaData = typeof data.content === 'string' 
        ? JSON.parse(data.content) 
        : data.content;
        
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
        // Convert DeltaStatic to DeltaStatic using toDelta to ensure type compatibility
        setContent(toDelta(result));
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
        editorContent={content} 
        quillRef={quillRef} 
        handleChange={handleChange}
        handleChangeSelection={handleChangeSelection}
        handleEditorClick={handleEditorClick}
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
