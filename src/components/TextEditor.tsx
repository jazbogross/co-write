
import React, { useEffect, useState } from 'react';
import ReactQuill from 'react-quill';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useLineData } from '@/hooks/useLineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useDraftLoader } from '@/hooks/useDraftLoader';
import { useUserData } from '@/hooks/useUserData';
import { useEditorLogger } from '@/hooks/useEditorLogger';
import { useEditorOperations } from '@/components/editor/TextEditorOperations';
import { TextEditorActions } from './editor/TextEditorActions';
import { TextEditorContent } from './editor/TextEditorContent';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { LineTrackingModule } from './editor/LineTracker';
import { DeltaContent } from '@/utils/editor/types';
import { extractPlainTextFromDelta } from '@/utils/editor';

// Register the LineTrackingModule with Quill
ReactQuill.Quill.register('modules/lineTracking', LineTrackingModule);

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  console.log('📋 TextEditor: Initializing with scriptId:', scriptId);
  
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  
  // Get user data
  const { userId } = useUserData();

  // Initialize line data
  const { 
    lineData, 
    setLineData,
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, "", userId);

  // Initialize text editor
  const { 
    quillRef,
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData,
    formats,
    modules
  } = useTextEditor(
    "", 
    scriptId, 
    lineData,
    setLineData, 
    isDataReady, 
    initializeEditor,
    updateLineContents
  );
  
  // Set up logging
  useEditorLogger(lineData, content, lineCount, editorInitialized, quillRef);

  // Set up editor operations
  const { handleContentChange, formatText, handleSave } = useEditorOperations({
    quillRef,
    editorInitialized,
    handleChange,
    flushContentToLineData
  });

  // Set up draft loading
  const { draftApplied } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent
  });

  // Set up draft loading attempt
  useEffect(() => {
    if (userId && isDataReady && !draftLoadAttempted) {
      console.log('📋 TextEditor: User ID available, loading drafts:', userId);
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, loadDraftsForCurrentUser, draftLoadAttempted]);

  // Set up submission handling
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    "",
    content instanceof Object ? JSON.stringify(content) : content, // Convert DeltaContent to string when needed
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );

  // Handle saving
  const handleSaveAndSync = () => {
    handleSave();
    saveToSupabase();
  };

  // Handle submitting
  const handleSubmitChanges = () => {
    console.log('📋 TextEditor: Submit button clicked');
    flushContentToLineData();
    handleSubmit();
  };

  // Show loading state
  if (!isDataReady) {
    console.log('📋 TextEditor: Data not ready, showing loading');
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  // Convert content to string if it's a DeltaContent for TextEditorContent
  const contentString = typeof content === 'string' 
    ? content 
    : extractPlainTextFromDelta(content);

  console.log('📋 TextEditor: Rendering editor with ready data');
  return (
    <>
      <TextEditorActions 
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={handleSubmitChanges}
        onSave={handleSaveAndSync}
      />
      
      <TextEditorContent
        content={contentString}
        lineCount={lineCount}
        quillRef={quillRef}
        modules={modules}
        formats={formats}
        onChange={handleContentChange}
      />

      {isAdmin && (
        <SuggestionsPanel
          isOpen={isSuggestionsOpen}
          scriptId={scriptId}
          onToggle={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
        />
      )}
    </>
  );
};
