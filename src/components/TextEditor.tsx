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
import { useTextEditor } from '@/hooks/useTextEditor';

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
  
  // Load user ID first
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // We initialize with an empty string and will load content from script_content table
  const { 
    lineData, 
    setLineData,
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, "", userId);

  // Set up and initialize text editor
  const {
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData
  } = useTextEditor(
    "", // Replace originalContent with empty string 
    scriptId, 
    quillRef, 
    lineData,
    setLineData, 
    isDataReady, 
    initializeEditor,
    updateLineContents
  );

  // Set up draft management with proper userId
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

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
        try {
          // Turn on programmatic update mode
          if (editor.lineTracking) {
            editor.lineTracking.setProgrammaticUpdate(true);
          }
          
          // Check if any line has Delta content
          const hasDeltaContent = lineData.some(line => typeof line.content === 'object' && line.content.ops);
          
          if (hasDeltaContent) {
            // Use the reconstructed Delta content from lineData
            const combinedDelta = {
              ops: lineData.flatMap(line => {
                if (typeof line.content === 'object' && line.content.ops) {
                  // Get the ops from the Delta
                  const ops = [...line.content.ops];
                  // Ensure the line ends with a newline
                  const lastOp = ops[ops.length - 1];
                  if (lastOp && typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')) {
                    ops.push({ insert: '\n' });
                  }
                  return ops;
                } else {
                  // Convert string content to ops
                  const content = typeof line.content === 'string' ? line.content : String(line.content);
                  return [{ insert: content }, { insert: '\n' }];
                }
              })
            };
            
            // Update editor content with the Delta
            updateEditorContent(combinedDelta);
          } else {
            // Combine all line content as plain text
            const combinedContent = lineData.map(line => line.content).join('\n');
            
            // Only update if content is different
            if (combinedContent !== content) {
              console.log('TextEditor: Updating editor content from loaded drafts');
              
              // Use the controlled update method to prevent loops
              updateEditorContent(combinedContent);
            }
          }
          
          setDraftApplied(true);
        } finally {
          // Turn off programmatic update mode
          if (editor.lineTracking) {
            editor.lineTracking.setProgrammaticUpdate(false);
          }
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent]);

  // Handler for content changes
  const handleContentChange = (newContent: string) => {
    handleChange(newContent);
    
    // Important: Flush changes to line data when content changes
    // This ensures lineData is always up-to-date with editor content
    if (editorInitialized) {
      setTimeout(() => flushContentToLineData(), 50); // Small timeout to let Quill finish its updates
    }
  };

  // Set up submission and saving functionality
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    "", // Replace originalContent with empty string
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );
  
  // Make sure we flush any pending updates when saving
  const handleSave = useCallback(() => {
    flushContentToLineData(); // First flush any pending content updates
    saveToSupabase(); // Then save to Supabase
  }, [flushContentToLineData, saveToSupabase]);

  // Format text function for toolbar
  const formatText = (format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    
    editor.format(format, value);
  };

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
          flushContentToLineData();
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
