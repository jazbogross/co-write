
import { useCallback } from 'react';
import ReactQuill from 'react-quill';

interface TextEditorOperationsProps {
  quillRef: React.RefObject<ReactQuill>;
  editorInitialized: boolean;
  handleChange: (content: string) => void;
  flushContentToLineData: () => void;
  captureCurrentContent?: () => any;
  captureEditorContent?: () => any;  // Add this new function prop
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
    // First capture current content using the more direct method if available
    let capturedContent = null;
    if (captureEditorContent) {
      capturedContent = captureEditorContent();
    } else if (captureCurrentContent) {
      capturedContent = captureCurrentContent();
    }
    
    // Then flush to line data
    const flushedContent = flushContentToLineData();
    
    // Return the captured content, prioritizing direct capture over flush result
    return capturedContent || flushedContent;
  }, [flushContentToLineData, captureCurrentContent, captureEditorContent]);

  return {
    handleContentChange,
    formatText,
    handleSave
  };
};
