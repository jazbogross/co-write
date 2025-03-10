
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
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const [isContentLoaded, setIsContentLoaded] = useState(false);
  const initializedRef = useRef(false);

  // Get user data
  const { userId } = useUserData();

  // Initialize line data - pass isAdmin to the hook
  const {
    lineData,
    setLineData,
    updateLineContents,
    loadDraftsForCurrentUser,
    isDataReady,
    initializeEditor,
  } = useLineData(scriptId, originalContent, userId, isAdmin);

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
    captureCurrentContent,
    formats,
    modules,
  } = useTextEditor(
    originalContent,  // Pass originalContent correctly here
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
    captureCurrentContent
  });

  // Draft loader - enhanced with ability to force updates
  const { draftApplied, applyDrafts } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent,
  });

  // Load drafts once data and editor are ready
  const attemptDraftLoad = useCallback(() => {
    if (userId && isDataReady && !draftLoadAttempted && !initializedRef.current) {
      console.log('📝 TextEditor: Loading drafts for user:', userId);
      initializedRef.current = true;
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, draftLoadAttempted, loadDraftsForCurrentUser]);

  // Effect to attempt draft loading
  useEffect(() => {
    attemptDraftLoad();
  }, [userId, isDataReady, attemptDraftLoad]);

  // Effect to check content after editor is ready
  useEffect(() => {
    if (editorInitialized && draftApplied && !isContentLoaded) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        
        // If we have lineData but editor is empty, force reapply drafts
        if (lines.length <= 1 && lineData.length > 1) {
          console.log('📝 TextEditor: Content missing after draft application, forcing update');
          setTimeout(() => {
            applyDrafts(); // Force update
          }, 100);
        } else if (lines.length > 0) {
          setIsContentLoaded(true);
        }
      }
    }
  }, [editorInitialized, draftApplied, lineData, quillRef, applyDrafts, isContentLoaded]);

  // Explicitly capture content before submission
  const captureAndSubmit = useCallback(() => {
    // Capture the current editor state
    const captured = captureCurrentContent?.();
    if (captured) {
      setContent(captured.content);
    }
    
    // Now flush line data and submit
    flushContentToLineData();
    return captured?.content || content;
  }, [captureCurrentContent, flushContentToLineData, content, setContent]);

  // Submissions
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    '',
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );

  // Save & sync
  const handleSaveAndSync = useCallback(() => {
    // Capture current content before saving
    const currentContent = captureAndSubmit();
    
    handleSave();
    saveToSupabase(currentContent);
  }, [handleSave, saveToSupabase, captureAndSubmit]);

  // Submit changes
  const handleSubmitChanges = useCallback(() => {
    // Capture current content before submitting
    const currentContent = captureAndSubmit();
    
    handleSubmit(currentContent);
  }, [captureAndSubmit, handleSubmit]);

  // Show loading if data not ready
  if (!isDataReady) {
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }
  
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
        content={content}
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
