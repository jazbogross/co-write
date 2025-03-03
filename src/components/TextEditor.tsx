
import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

// Register the LineTrackingModule with Quill - only do this once
if (!ReactQuill.Quill.import('modules/lineTracking')) {
  ReactQuill.Quill.register('modules/lineTracking', LineTrackingModule);
}

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string | DeltaContent) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  console.log('📋 TextEditor: Initializing with scriptId:', scriptId, 'isAdmin:', isAdmin);
  
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const initializedRef = useRef(false);
  
  // Get user data
  const { userId } = useUserData();

  // Initialize line data - pass isAdmin flag
  const { 
    lineData, 
    setLineData,
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, "", userId, isAdmin);

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
  
  // Set up logging with controlled frequency
  useEditorLogger(lineData, content, lineCount, editorInitialized, quillRef);

  // Set up editor operations
  const { handleContentChange, formatText, handleSave } = useEditorOperations({
    quillRef,
    editorInitialized,
    handleChange,
    flushContentToLineData
  });

  // Set up draft loading with protection against multiple loads
  const { draftApplied } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent
  });

  // Set up draft loading attempt - use callback to prevent recreation
  const attemptDraftLoad = useCallback(() => {
    if (userId && isDataReady && !draftLoadAttempted && !initializedRef.current) {
      console.log('📋 TextEditor: User ID available, loading drafts:', userId);
      initializedRef.current = true;
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, draftLoadAttempted, loadDraftsForCurrentUser]);
  
  // Load drafts when data is ready
  useEffect(() => {
    attemptDraftLoad();
  }, [userId, isDataReady, attemptDraftLoad]);

  // Set up submission handling - updated to handle both string and DeltaContent
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    "",
    content, // This can be DeltaContent or string
    lineData,
    userId,
    onSuggestChange, // Now properly typed to accept DeltaContent
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );

  // Handle saving
  const handleSaveAndSync = useCallback(() => {
    console.log('📋 TextEditor: Save button clicked');
    handleSave();
    saveToSupabase();
  }, [handleSave, saveToSupabase]);

  // Handle submitting
  const handleSubmitChanges = useCallback(() => {
    console.log('📋 TextEditor: Submit button clicked');
    flushContentToLineData();
    handleSubmit();
  }, [flushContentToLineData, handleSubmit]);

  // Show loading state
  if (!isDataReady) {
    console.log('📋 TextEditor: Data not ready, showing loading');
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  // Convert content to string for TextEditorContent if needed
  const contentString = typeof content === 'string' 
    ? content 
    : extractPlainTextFromDelta(isDeltaObject(content) ? content : { ops: [{ insert: '' }] });

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
