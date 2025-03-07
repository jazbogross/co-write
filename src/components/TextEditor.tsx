
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
import { LineTrackingModule } from './editor/LineTrackingModule';
import { SuggestionFormatModule } from './editor/SuggestionFormatModule';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

// Quill's default Snow theme CSS
import 'react-quill/dist/quill.snow.css';

// --- Register modules just once ---
// Register SuggestionFormatModule first - make sure it happens before the LineTrackingModule
try {
  // Try to register SuggestionFormatModule first
  SuggestionFormatModule.register(ReactQuill.Quill);
  // Then register LineTrackingModule
  LineTrackingModule.register(ReactQuill.Quill);
  console.log('📝 All Quill modules registered successfully');
} catch (error) {
  console.error('📝 Error registering Quill modules:', error);
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

  // Draft loader - now with isAdmin parameter
  const { draftApplied } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent,
    isAdmin, // Pass isAdmin to the hook
  });

  // Attempt draft load
  const attemptDraftLoad = useCallback(() => {
    if (userId && isDataReady && !draftLoadAttempted && !initializedRef.current) {
      console.log('📋 TextEditor: User ID available, loading drafts:', userId, 'isAdmin:', isAdmin);
      initializedRef.current = true;
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, draftLoadAttempted, loadDraftsForCurrentUser, isAdmin]);

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

  console.log('📋 TextEditor: Rendering editor with ready data');
  console.log('📋 TextEditor: Content type:', typeof content, isDeltaObject(content) ? 'isDelta' : 'notDelta');
  
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
        content={content} // Direct pass of content, which can be string or Delta
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
