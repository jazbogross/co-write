
import React, { useCallback } from 'react';
import ReactQuill from 'react-quill';
import { extractLineContents } from '@/utils/editorUtils';
import { useContentBuffer } from '@/hooks/useContentBuffer';

interface EditorFormattingProps {
  quillRef: React.RefObject<ReactQuill>;
  updateLineContents: (lines: any[], editor: any) => void;
  editorInitialized: boolean;
}

export const useEditorFormatting = ({
  quillRef,
  updateLineContents,
  editorInitialized
}: EditorFormattingProps) => {
  // Set up content buffer to debounce updates
  const { updateContent: updateBufferedContent, flushUpdate } = useContentBuffer(
    [],
    (lines) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        updateLineContents(lines, editor);
      }
    },
    { debounceTime: 300, minChangeInterval: 200 }
  );

  // Process content changes and extract formatted line data
  const processContentChange = useCallback((editor: any, lines: any[]) => {
    if (!editorInitialized) return;
    
    // Extract line contents with formatting for later saving
    const currentLineContents = extractLineContents(lines, editor);
    
    // Update through the buffer to debounce changes
    updateBufferedContent(currentLineContents);
  }, [editorInitialized, updateBufferedContent]);

  // Format text in the editor
  const formatText = useCallback((format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const format_value = editor.getFormat();
      if (format === 'align') {
        editor.format('align', value === format_value['align'] ? false : value);
      } else {
        editor.format(format, !format_value[format]);
      }
    }
  }, [quillRef]);

  return {
    formatText,
    processContentChange,
    flushUpdate
  };
};
