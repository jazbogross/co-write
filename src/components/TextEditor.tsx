
import React, { useRef, useState, useEffect, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '@/integrations/supabase/client';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { LineTrackingModule, EDITOR_MODULES } from './editor/LineTrackingModule';
import { EditorContainer } from './editor/EditorContainer';
import { EditorActions } from './editor/EditorActions';
import { useLineData } from '@/hooks/useLineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { extractLineContents } from '@/utils/editorUtils';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useEditorFormatting } from './editor/EditorFormatting';

// Register the module
LineTrackingModule.register(ReactQuill.Quill);

const formats = ['bold', 'italic', 'align'];

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
  const quillRef = useRef<ReactQuill>(null);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);

  // Load line data and prepare editor
  const { 
    lineData, 
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, originalContent, null); // Pass null initially, will update with userId

  // Set up and initialize text editor
  const {
    content,
    setContent,
    userId,
    lineCount,
    editorInitialized,
    handleChange
  } = useTextEditor(
    originalContent, 
    scriptId, 
    quillRef, 
    lineData, 
    isDataReady, 
    initializeEditor,
    updateLineContents
  );

  // Set up editor formatting and content processing
  const { 
    formatText, 
    processContentChange, 
    flushUpdate 
  } = useEditorFormatting({
    quillRef,
    updateLineContents,
    editorInitialized
  });

  // Handler for content changes
  const handleContentChange = (newContent: string) => {
    const result = handleChange(newContent);
    if (result && result.editor) {
      processContentChange(result.editor, result.lines);
    }
  };

  // Set up submission and saving functionality
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    originalContent,
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser
  );
  
  // Make sure we flush any pending updates when saving
  const handleSave = useCallback(() => {
    flushUpdate(); // First flush any pending content updates
    saveToSupabase(); // Then save to Supabase
  }, [flushUpdate, saveToSupabase]);

  // Don't render editor until data is ready
  if (!isDataReady) {
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  return (
    <>
      <EditorActions
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={() => {
          flushUpdate();
          handleSubmit();
        }}
        onSave={handleSave}
      />
      
      <EditorContainer
        content={content}
        lineCount={lineCount}
        quillRef={quillRef}
        modules={EDITOR_MODULES}
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
