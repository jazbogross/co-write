
import { useRef, useEffect, useCallback } from 'react';
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
  // Flag to identify if we're loading drafts or content for the first time
  const isInitialLoadRef = useRef(true);
  const contentLoadedRef = useRef(false);
  
  // Get editor content management utilities
  const { updateEditorContent, isUpdatingEditorRef, markForFullContentUpdate } = useEditorContentManagement(setContent);
  
  // Get content change handler - optimized to only track line changes, not every keystroke
  const { contentUpdateRef, handleChange, lastLineCountRef } = useContentChangeHandler(
    editorInitialized,
    quillRef,
    setContent,
    isProcessingLinesRef,
    isUpdatingEditorRef
  );

  // Create the wrapped updateEditorContent function that includes the editor reference
  const updateEditor = useCallback((newContent: string | DeltaContent, forceUpdate: boolean = false) => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      // If this is an initial load or we're forcing an update, mark it for full content update
      if (isInitialLoadRef.current || forceUpdate) {
        console.log('🔄 useContentUpdates: Performing full content update');
        markForFullContentUpdate();
        isInitialLoadRef.current = false;
      }
      
      // Save cursor position if we have lineTracking
      if (editor.lineTracking && typeof editor.lineTracking.saveCursorPosition === 'function') {
        editor.lineTracking.saveCursorPosition();
      }
      
      // Skip empty content updates during initialization
      if (!contentLoadedRef.current && 
          (typeof newContent === 'string' && newContent === '')) {
        console.log('🔄 useContentUpdates: Skipping empty content update during initialization');
        return;
      }
      
      // Skip if content is exactly the same
      if (newContent === content) {
        console.log('🔄 useContentUpdates: Content unchanged, skipping update');
        return;
      }
      
      // Update the content
      updateEditorContent(editor, newContent, forceUpdate);
      
      // If the content isn't empty, mark that we've loaded content
      if (typeof newContent === 'string' && newContent.length > 0) {
        contentLoadedRef.current = true;
      } else if (isDeltaObject(newContent) && (newContent as DeltaContent).ops && (newContent as DeltaContent).ops.length > 0) {
        contentLoadedRef.current = true;
      }
      
      // Restore cursor position if we have lineTracking
      if (editor.lineTracking && typeof editor.lineTracking.restoreCursorPosition === 'function') {
        editor.lineTracking.restoreCursorPosition();
      }
      
      // Update line count after content update
      const lines = editor.getLines(0);
      console.log('🔄 useContentUpdates: Updated editor content, line count:', lines.length);
      setLineCount(lines.length);
      lastLineCountRef.current = lines.length;
    }
  }, [quillRef, markForFullContentUpdate, updateEditorContent, setLineCount, lastLineCountRef, content]);
  
  // Explicitly capture current editor state for saving
  const captureCurrentContent = useCallback(() => {
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const editorDelta = editor.getContents();
      const convertedDelta: DeltaContent = {
        ops: editorDelta.ops.map(op => ({
          ...op,
          insert: op.insert || ''
        }))
      };
      setContent(convertedDelta);
      
      // Update line count
      const lines = editor.getLines(0);
      setLineCount(lines.length);
      
      return {
        content: convertedDelta,
        lineCount: lines.length
      };
    }
    return null;
  }, [quillRef, setContent, setLineCount]);
  
  // Verify content after initialization - if empty, try to use lineData
  useEffect(() => {
    if (editorInitialized && !contentLoadedRef.current) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        
        // If the editor has no content but should have content, mark for full update
        if (lines.length <= 1 && (
            (typeof content === 'string' && content.length > 0) ||
            (isDeltaObject(content) && (content as DeltaContent).ops && (content as DeltaContent).ops.length > 0)
          )) {
          console.log('🔄 useContentUpdates: Content missing after initialization, forcing update');
          markForFullContentUpdate();
          updateEditor(content, true);
        }
      }
    }
  }, [editorInitialized, content, quillRef, markForFullContentUpdate, updateEditor]);

  return {
    contentUpdateRef,
    handleChange,
    updateEditorContent: updateEditor,
    captureCurrentContent
  };
};
