
import { useCallback } from 'react';
import ReactQuill from 'react-quill';

interface TextEditorOperationsProps {
  quillRef: React.RefObject<ReactQuill>;
  editorInitialized: boolean;
  handleChange: (content: string) => void;
  flushContentToLineData: () => void;
  captureCurrentContent?: () => any;
}

export const useEditorOperations = ({
  quillRef,
  editorInitialized,
  handleChange,
  flushContentToLineData,
  captureCurrentContent
}: TextEditorOperationsProps) => {
  
  const handleContentChange = useCallback((newContent: string) => {
    // We let Quill handle DOM updates directly without React state updates
    // Only call the change handler for structural changes or when needed
    handleChange(newContent);
  }, [handleChange]);

  const formatText = useCallback((format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    editor.format(format, value);
  }, [quillRef]);

  const handleSave = useCallback(() => {
    // First capture current content if possible
    if (captureCurrentContent) {
      captureCurrentContent();
    }
    
    // Then flush to line data
    flushContentToLineData();
  }, [flushContentToLineData, captureCurrentContent]);

  return {
    handleContentChange,
    formatText,
    handleSave
  };
};
