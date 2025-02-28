
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
  const [lineUuidsInitialized, setLineUuidsInitialized] = useState(false);
  const uuidInitializationAttempts = useRef(0);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const { lineData, updateLineContents, loadDraftsForCurrentUser } = useLineData(scriptId, originalContent, userId);

  // Set initial content - ONLY original content, never reconstructed
  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized) {
      // Always use original content to maintain formatting
      setContent(originalContent);
      setIsContentInitialized(true);
      
      // Update line count based on what's in the editor
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        setLineCount(lines.length || lineData.length);
      } else {
        setLineCount(lineData.length);
      }
    }
  }, [lineData, isContentInitialized, originalContent]);

  // Initialize line UUIDs after React has rendered them to the DOM
  // Try multiple times with increasing delays until successful
  useEffect(() => {
    if (!quillRef.current || lineData.length === 0 || lineUuidsInitialized) {
      return;
    }

    // We'll try to initialize UUIDs multiple times with increasing delay
    // to ensure React has had time to render the UUIDs into the DOM
    const initializeUuidsWithRetry = () => {
      const editor = quillRef.current?.getEditor();
      if (!editor || !editor.lineTracking || uuidInitializationAttempts.current >= 5) {
        return;
      }

      const success = editor.lineTracking.initializeUuids();
      
      if (success) {
        console.log("UUID initialization successful");
        setLineUuidsInitialized(true);
      } else {
        // Retry with increasing delay up to 5 attempts
        const attemptNumber = ++uuidInitializationAttempts.current;
        const delay = Math.min(100 * Math.pow(2, attemptNumber), 3000); // Exponential backoff capped at 3s
        console.log(`UUID initialization failed, retrying in ${delay}ms (attempt ${attemptNumber})`);
        
        setTimeout(initializeUuidsWithRetry, delay);
      }
    };

    // Only attempt if we have lineData and the component is fully initialized
    if (lineData.length > 0 && isContentInitialized) {
      setTimeout(initializeUuidsWithRetry, 100); // Initial delay
    }
  }, [lineData, isContentInitialized, lineUuidsInitialized]);

  // Set line UUIDs in the DOM ONLY ONCE after initial load
  useEffect(() => {
    if (quillRef.current && lineData.length > 0 && !lineUuidsInitialized && isContentInitialized) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        
        // Only update line UUIDs if we have lines in the editor
        if (lines.length > 0) {
          // Set UUIDs only once, and only for lines that don't have them
          lines.forEach((line, index) => {
            if (line.domNode && index < lineData.length) {
              // Only set if the DOM element doesn't already have a uuid
              if (!line.domNode.getAttribute('data-line-uuid')) {
                line.domNode.setAttribute('data-line-uuid', lineData[index].uuid);
              }
            }
          });
        }
      }
    }
  }, [lineData, lineUuidsInitialized, isContentInitialized]);

  const handleChange = (newContent: string) => {
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
