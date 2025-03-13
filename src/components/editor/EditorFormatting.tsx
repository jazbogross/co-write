
import React, { useCallback } from 'react';
import ReactQuill from 'react-quill';

interface EditorFormattingProps {
  quillRef: React.RefObject<ReactQuill>;
  editorInitialized: boolean;
}

export const useEditorFormatting = ({
  quillRef,
  editorInitialized
}: EditorFormattingProps) => {
  
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
    formatText
  };
};
