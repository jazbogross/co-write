
import { useState, useRef, useCallback } from 'react';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

export const useEditorState = (originalContent: string) => {
  console.log('🎛️ useEditorState: Initializing with content length:', originalContent?.length || 0);
  
  const [content, setContent] = useState<string | DeltaContent>(originalContent || "");
  const [lineCount, setLineCount] = useState(1);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const isProcessingLinesRef = useRef(false);
  // Add initialization tracking to prevent re-initialization
  const hasInitializedRef = useRef(false);
  
  // Memoize state updates to prevent unnecessary re-renders
  const updateContent = useCallback((newContent: string | DeltaContent) => {
    console.log('🎛️ useEditorState: Content updated, type:', 
      typeof newContent, isDeltaObject(newContent) ? 'isDelta' : 'notDelta');
    setContent(newContent);
  }, []);
  
  const updateLineCount = useCallback((count: number) => {
    if (count !== lineCount) {
      console.log('🎛️ useEditorState: Line count updated:', lineCount, '->', count);
      setLineCount(count);
    }
  }, [lineCount]);
  
  const setInitialized = useCallback((initialized: boolean) => {
    if (initialized !== editorInitialized && !hasInitializedRef.current) {
      console.log('🎛️ useEditorState: Editor initialized state changed:', editorInitialized, '->', initialized);
      setEditorInitialized(initialized);
      if (initialized) {
        hasInitializedRef.current = true;
      }
    }
  }, [editorInitialized]);
  
  return {
    content,
    setContent: updateContent,
    lineCount,
    setLineCount: updateLineCount,
    editorInitialized,
    setEditorInitialized: setInitialized,
    isProcessingLinesRef,
    hasInitializedRef
  };
};
