
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
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const [loadingDrafts, setLoadingDrafts] = useState(false);

  // Load line data and prepare editor
  const { 
    lineData, 
    updateLineContents,
    loadDraftsForCurrentUser, 
    draftStatus,
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

  // Handle manual draft loading
  const handleLoadDrafts = useCallback(async () => {
    if (loadingDrafts) return;
    
    setLoadingDrafts(true);
    try {
      const hasDrafts = await loadDraftsForCurrentUser();
      
      if (hasDrafts) {
        toast({
          title: "Drafts loaded",
          description: "Your saved drafts have been successfully loaded",
        });
      } else {
        toast({
          title: "No drafts found",
          description: "No saved drafts were found for this script",
          variant: "default",
        });
      }
    } catch (error) {
      console.error('Error loading drafts:', error);
      toast({
        title: "Error",
        description: "Failed to load drafts. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoadingDrafts(false);
    }
  }, [loadDraftsForCurrentUser, loadingDrafts, toast]);

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
        isSubmitting={isSubmitting || loadingDrafts}
        onFormat={formatText}
        onSubmit={() => {
          flushUpdate();
          handleSubmit();
        }}
        onSave={handleSave}
        onLoadDrafts={handleLoadDrafts}
        hasUnsavedDrafts={draftStatus.lastLoadedTimestamp > 0}
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
