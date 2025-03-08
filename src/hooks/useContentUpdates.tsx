
import { useRef } from 'react';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';
import { useContentChangeHandler } from './editor/useContentChangeHandler';
import { useEditorContentManagement } from './editor/useEditorContentManagement';

export const useContentUpdates = (
  content: string | DeltaContent,
  setContent: (value: string | DeltaContent) => void,
  lineCount: number,
  setLineCount: (count: number) => void,
  editorInitialized: boolean,
  isProcessingLinesRef: React.MutableRefObject<boolean>,
  quillRef: React.RefObject<ReactQuill>
) => {
  console.log('📝 useContentUpdates: Hook called with', {
    contentType: typeof content,
    lineCount,
    editorInitialized
  });
  
  // Get editor content management utilities
  const { updateEditorContent, isUpdatingEditorRef } = useEditorContentManagement(setContent);
  
  // Get content change handler
  const { contentUpdateRef, handleChange } = useContentChangeHandler(
    editorInitialized,
    quillRef,
    setContent,
    isProcessingLinesRef,
    isUpdatingEditorRef
  );

  // Create the wrapped updateEditorContent function that updates line count
  const updateEditor = (newContent: string | DeltaContent, forceUpdate: boolean = false) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      // Just call updateEditorContent with the content and forceUpdate flag
      updateEditorContent(newContent, forceUpdate);
      
      // Update line count after content update
      const lines = editor.getLines(0);
      console.log(`📝 useContentUpdates: Updated line count: ${lines.length}`);
      setLineCount(lines.length);
    } else {
      console.log('📝 useContentUpdates: No editor available for updateEditor');
    }
  };

  return {
    contentUpdateRef,
    handleChange,
    updateEditorContent: updateEditor
  };
};
