
import { useState, useRef, useCallback } from 'react';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

export const useEditorState = (originalContent: string) => {
  // Log initial state for debugging
  console.log('🎛️ useEditorState: Initializing with content length:', originalContent?.length || 0);
  
  // Check if we have original content - if so, use it; otherwise use empty string/delta
  const initialContent = originalContent || "";
  const [content, setContent] = useState<string | DeltaContent>(initialContent);
  const [lineCount, setLineCount] = useState(1);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const isProcessingLinesRef = useRef(false);
  // Add initialization tracking to prevent re-initialization
  const hasInitializedRef = useRef(false);
  // Track content reset to prevent unnecessary resets
  const contentResetRef = useRef(false);
  
  // Memoize state updates to prevent unnecessary re-renders
  const updateContent = useCallback((newContent: string | DeltaContent) => {
    console.log('🎛️ useEditorState: Content updated, type:', 
      typeof newContent, isDeltaObject(newContent) ? 'isDelta' : 'notDelta');
    
    // Skip update if we're resetting to empty content when we already have content
    if ((typeof newContent === 'string' && newContent === '') && 
        (typeof content !== 'string' || content !== '')) {
      console.log('🎛️ useEditorState: Skipping reset to empty content');
      return;
    }
    
    // Don't replace existing content with empty content during initialization
    if (!editorInitialized && (typeof newContent === 'string' && newContent === '')) {
      console.log('🎛️ useEditorState: Skipping empty update during initialization');
      return;
    }
    
    // Preserve Delta objects, don't convert them to strings
    setContent(newContent);
    
    // Mark content as having been reset if we're setting meaningful content
    if (newContent && 
       (typeof newContent !== 'string' || newContent.length > 0)) {
      contentResetRef.current = true;
    }
  }, [content, editorInitialized]);
  
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
    hasInitializedRef,
    contentResetRef
  };
};
