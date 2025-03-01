
import React, { useRef, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { supabase } from '@/integrations/supabase/client';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { LineTrackingModule, EDITOR_MODULES } from './editor/LineTrackingModule';
import { EditorContainer } from './editor/EditorContainer';
import { EditorActions } from './editor/EditorActions';
import { useLineData, type LineData } from '@/hooks/useLineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { extractLineContents } from '@/utils/editorUtils';

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
  const [content, setContent] = useState(originalContent);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [lineCount, setLineCount] = useState(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);

  useEffect(() => {
    console.log('**** TextEditor.tsx **** Content changed.');
    console.log('**** TextEditor.tsx **** Fetching user...');
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('**** TextEditor.tsx **** User fetched:', user.id);
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const { 
    lineData, 
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, originalContent, userId);

  // Set initial content - ONLY original content, never reconstructed
  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized) {
      // Always use original content to maintain formatting
      console.log('**** TextEditor.tsx **** Setting initial content');
      setContent(originalContent);
      setIsContentInitialized(true);
      
      // Update line count based on what's in the editor
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        console.log('**** TextEditor.tsx **** Initial line count from editor:', lines.length);
        setLineCount(lines.length || lineData.length);
      } else {
        setLineCount(lineData.length);
      }
    }
  }, [lineData, isContentInitialized, originalContent]);

  // Initialize editor ONLY once LineData is ready
  useEffect(() => {
    if (quillRef.current && isDataReady && !editorInitialized) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        console.log('**** TextEditor.tsx **** LineData is ready, initializing editor...');
        // Use the initializeEditor function from useLineData to set UUIDs correctly
        const success = initializeEditor(editor);
        
        if (success) {
          console.log('**** TextEditor.tsx **** Editor successfully initialized');
          setEditorInitialized(true);
          
          // Count lines again to make sure we're in sync
          const lines = editor.getLines(0);
          setLineCount(lines.length);
          
          if (lines.length > 0 && lines[0].domNode) {
            console.log('**** TextEditor.tsx **** First line UUID:', 
              lines[0].domNode.getAttribute('data-line-uuid'));
          }
        } else {
          console.error('**** TextEditor.tsx **** Failed to initialize editor');
        }
      }
    }
  }, [isDataReady, editorInitialized, initializeEditor]);

  const handleChange = (newContent: string) => {
    // Only allow changes once editor is properly initialized
    if (!editorInitialized) {
      console.log('**** TextEditor.tsx **** Ignoring content change before editor initialization');
      return;
    }
    
    console.log('**** TextEditor.tsx **** Content changed.');
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    // Simply update the content directly - no JSON reconstruction
    setContent(newContent);
    
    const lines = editor.getLines(0);
    setLineCount(lines.length);
    
    // Extract line contents with formatting for later saving
    // but don't update the editor content with these
    const currentLineContents = extractLineContents(lines, editor);
    updateLineContents(currentLineContents, editor);
  };

  const formatText = (format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const format_value = editor.getFormat();
      if (format === 'align') {
        editor.format('align', value === format_value['align'] ? false : value);
      } else {
        editor.format(format, !format_value[format]);
      }
    }
  };

  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    originalContent,
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser // Pass the function to be called after save
  );

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
        onSubmit={handleSubmit}
        onSave={saveToSupabase}
      />
      
      <EditorContainer
        content={content}
        lineCount={lineCount}
        quillRef={quillRef}
        modules={EDITOR_MODULES}
        formats={formats}
        onChange={handleChange}
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
