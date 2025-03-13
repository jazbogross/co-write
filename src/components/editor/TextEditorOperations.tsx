
import { useCallback } from 'react';
import ReactQuill from 'react-quill';

interface TextEditorOperationsProps {
  quillRef: React.RefObject<ReactQuill>;
  editorInitialized: boolean;
  handleChange: (content: string) => void;
}

export const useEditorOperations = ({
  quillRef,
  editorInitialized,
  handleChange,
}: TextEditorOperationsProps) => {
  
  const handleContentChange = useCallback((newContent: string) => {
    handleChange(newContent);
  }, [handleChange]);

  const formatText = useCallback((format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    editor.format(format, value);
  }, [quillRef]);

  const handleSave = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      return editor.getContents();
    }
    return null;
  }, [quillRef]);

  return {
    handleContentChange,
    formatText,
    handleSave
  };
};
