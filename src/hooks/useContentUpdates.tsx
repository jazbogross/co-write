
import { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';
import { useContentChangeHandler } from './editor/useContentChangeHandler';
import { useEditorContentManagement } from './editor/useEditorContentManagement';
import { isDeltaObject } from '@/utils/editor';

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
  
  // Flag to identify if we're loading drafts or content for the first time
  const isInitialLoadRef = useRef(true);
  
  // Get editor content management utilities
  const { updateEditorContent, isUpdatingEditorRef, markForFullContentUpdate } = useEditorContentManagement(setContent);
  
  // Get content change handler
  const { contentUpdateRef, handleChange } = useContentChangeHandler(
    editorInitialized,
    quillRef,
    setContent,
    isProcessingLinesRef,
    isUpdatingEditorRef
  );

  // Create the wrapped updateEditorContent function that includes the editor reference
  const updateEditor = (newContent: string | DeltaContent, forceUpdate: boolean = false) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      // If this is an initial load or we're forcing an update, mark it for full content update
      if (isInitialLoadRef.current || forceUpdate) {
        markForFullContentUpdate();
        isInitialLoadRef.current = false;
      }
      
      // Save cursor position if we have lineTracking
      if (editor.lineTracking && typeof editor.lineTracking.saveCursorPosition === 'function') {
        editor.lineTracking.saveCursorPosition();
      }
      
      // Update the content
      updateEditorContent(editor, newContent, forceUpdate);
      
      // Restore cursor position if we have lineTracking
      if (editor.lineTracking && typeof editor.lineTracking.restoreCursorPosition === 'function') {
        editor.lineTracking.restoreCursorPosition();
      }
      
      // Update line count after content update
      const lines = editor.getLines(0);
      console.log(`📝 useContentUpdates: Updated line count: ${lines.length}`);
      setLineCount(lines.length);
    } else {
      console.log('📝 useContentUpdates: No editor available for updateEditor');
    }
  };
  
  // When editor is initialized, mark that any content update should be a full reset
  useEffect(() => {
    if (editorInitialized && isInitialLoadRef.current) {
      // Make sure the first update after initialization is a full content reset
      markForFullContentUpdate();
    }
  }, [editorInitialized, markForFullContentUpdate]);

  return {
    contentUpdateRef,
    handleChange,
    updateEditorContent: updateEditor
  };
};
