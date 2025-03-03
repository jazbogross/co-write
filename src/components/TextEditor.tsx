
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
import { extractLineContents } from '@/utils/editor';
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
  const [userId, setUserId] = useState<string | null>(null);
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);
  
  // Load user ID first
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Load line data and prepare editor - now with proper userId
  const { 
    lineData, 
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, originalContent, userId);

  // Set up and initialize text editor
  const {
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent
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
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );
  
  // Make sure we flush any pending updates when saving
  const handleSave = useCallback(() => {
    flushUpdate(); // First flush any pending content updates
    saveToSupabase(); // Then save to Supabase
  }, [flushUpdate, saveToSupabase]);

  // Load drafts when userId becomes available
  useEffect(() => {
    if (userId && isDataReady && !draftLoadAttempted) {
      console.log('TextEditor: User ID available, loading drafts:', userId);
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, loadDraftsForCurrentUser, draftLoadAttempted]);

  // Force editor content update when lineData changes due to draft loading
  useEffect(() => {
    if (editorInitialized && draftLoadAttempted && lineData.length > 0 && !draftApplied) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        // Combine all line content as plain text
        const combinedContent = lineData.map(line => line.content).join('\n');
        
        // Only update if content is different
        if (combinedContent !== content) {
          console.log('TextEditor: Updating editor content from loaded drafts');
          
          // Use the controlled update method to prevent loops
          updateEditorContent(combinedContent);
          setDraftApplied(true);
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent]);

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
