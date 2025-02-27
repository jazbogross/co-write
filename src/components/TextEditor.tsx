
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
import { extractLineContents, reconstructContent } from '@/utils/editorUtils';

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

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  const { lineData, updateLineContent } = useLineData(scriptId, originalContent, userId);

  // Set initial content when line data is loaded
  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized) {
      const reconstructedContent = reconstructContent(lineData);
      setContent(reconstructedContent);
      setIsContentInitialized(true);
      setLineCount(lineData.length);
    }
  }, [lineData, isContentInitialized]);

  // Update line UUIDs in the DOM
  useEffect(() => {
    if (quillRef.current && lineData.length > 0) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        lines.forEach((line, index) => {
          if (line.domNode && index < lineData.length) {
            line.domNode.setAttribute('data-line-uuid', lineData[index].uuid);
          }
        });
      }
    }
  }, [lineData, content]);

  const handleChange = (newContent: string) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    setContent(newContent);
    const lines = editor.getLines(0);
    setLineCount(lines.length);
    
    const currentLineContents = extractLineContents(lines);
    currentLineContents.forEach((lineContent, index) => {
      updateLineContent(index, lineContent);
    });
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
    onSuggestChange
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
