// File: src/components/editor/TextEditor.tsx

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

// Quill's default Snow theme CSS
import 'react-quill/dist/quill.snow.css';

// --- Register the line tracking module just once ---
LineTrackingModule.register(ReactQuill.Quill);

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

  // Initialize line data
  const {
    lineData,
    setLineData,
    updateLineContents,
    loadDraftsForCurrentUser,
    isDataReady,
    initializeEditor,
  } = useLineData(scriptId, '', userId, isAdmin);

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
    modules,
  } = useTextEditor(
    '',
    scriptId,
    lineData,
    setLineData,
    isDataReady,
    initializeEditor,
    updateLineContents
  );

  // Set up logging
  useEditorLogger(lineData, content, lineCount, editorInitialized, quillRef);

  // Editor operations (format, save, etc.)
  const { handleContentChange, formatText, handleSave } = useEditorOperations({
    quillRef,
    editorInitialized,
    handleChange,
    flushContentToLineData,
  });

  // Draft loader
  const { draftApplied } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent,
  });

  // Attempt draft load
  const attemptDraftLoad = useCallback(() => {
    if (userId && isDataReady && !draftLoadAttempted && !initializedRef.current) {
      console.log('📋 TextEditor: User ID available, loading drafts:', userId);
      initializedRef.current = true;
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, draftLoadAttempted, loadDraftsForCurrentUser]);

  useEffect(() => {
    attemptDraftLoad();
  }, [userId, isDataReady, attemptDraftLoad]);

  // Submissions
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    '',
    content, // can be string or DeltaContent
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );

  // Save & sync
  const handleSaveAndSync = useCallback(() => {
    console.log('📋 TextEditor: Save button clicked');
    handleSave();
    saveToSupabase();
  }, [handleSave, saveToSupabase]);

  // Submit changes
  const handleSubmitChanges = useCallback(() => {
    console.log('📋 TextEditor: Submit button clicked');
    flushContentToLineData();
    handleSubmit();
  }, [flushContentToLineData, handleSubmit]);

  // Show loading if data not ready
  if (!isDataReady) {
    console.log('📋 TextEditor: Data not ready, showing loading');
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  // Convert content to plain string (for display in TextEditorContent)
  const contentString =
    typeof content === 'string'
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
