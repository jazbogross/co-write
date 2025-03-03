
import { useState, useRef } from 'react';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

export const useEditorState = (originalContent: string) => {
  console.log('🎛️ useEditorState: Initializing with content length:', originalContent?.length || 0);
  
  const [content, setContent] = useState<string | DeltaContent>(originalContent || "");
  const [lineCount, setLineCount] = useState(1);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const isProcessingLinesRef = useRef(false);
  
  // Log state changes for debugging
  const updateContent = (newContent: string | DeltaContent) => {
    console.log('🎛️ useEditorState: Content updated, type:', 
      typeof newContent, isDeltaObject(newContent) ? 'isDelta' : 'notDelta');
    setContent(newContent);
  };
  
  const updateLineCount = (count: number) => {
    if (count !== lineCount) {
      console.log('🎛️ useEditorState: Line count updated:', lineCount, '->', count);
      setLineCount(count);
    }
  };
  
  const setInitialized = (initialized: boolean) => {
    if (initialized !== editorInitialized) {
      console.log('🎛️ useEditorState: Editor initialized state changed:', editorInitialized, '->', initialized);
      setEditorInitialized(initialized);
    }
  };
  
  return {
    content,
    setContent: updateContent,
    lineCount,
    setLineCount: updateLineCount,
    editorInitialized,
    setEditorInitialized: setInitialized,
    isProcessingLinesRef
  };
};
