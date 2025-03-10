
import { useCallback } from 'react';
import ReactQuill from 'react-quill';
import { captureContentFromDOM } from '@/utils/saveDraftUtils';

interface TextEditorOperationsProps {
  quillRef: React.RefObject<ReactQuill>;
  editorInitialized: boolean;
  handleChange: (content: string) => void;
  flushContentToLineData: () => void;
  captureCurrentContent?: () => any;
  captureEditorContent?: () => any;
}

export const useEditorOperations = ({
  quillRef,
  editorInitialized,
  handleChange,
  flushContentToLineData,
  captureCurrentContent,
  captureEditorContent
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
    // Directly capture from DOM for most accurate content
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const domCapture = captureContentFromDOM(editor);
      if (domCapture) {
        return domCapture;
      }
    }
    
    // Fallback to other capture methods if direct DOM capture fails
    if (captureEditorContent) {
      return captureEditorContent();
    } else if (captureCurrentContent) {
      return captureCurrentContent();
    }
    
    // Final fallback - use flushContentToLineData
    return flushContentToLineData();
  }, [quillRef, flushContentToLineData, captureCurrentContent, captureEditorContent]);

  return {
    handleContentChange,
    formatText,
    handleSave
  };
};
