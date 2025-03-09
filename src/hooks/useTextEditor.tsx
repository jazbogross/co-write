
import { useRef, useCallback, useMemo } from 'react';
import { LineData } from '@/hooks/useLineData';
import { useEditorState } from './editor/useEditorState';
import { useEditorIntegration } from './editor/useEditorIntegration';
import { useContentFlushing } from './editor/useContentFlushing';
import { useEditorInitialization } from './useEditorInitialization';
import { useContentInitialization } from './useContentInitialization';
import { useContentUpdates } from './useContentUpdates';
import { useDraftManagement } from './useDraftManagement';
import { isDeltaObject } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';

export const useTextEditor = (
  originalContent: string, 
  scriptId: string,
  lineData: LineData[],
  setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
  isDataReady: boolean,
  initializeEditor: (editor: any) => boolean,
  updateLineContents: (lines: any[], editor: any) => void
) => {
  // Track if editor has been fully initialized to prevent re-initialization
  const fullyInitializedRef = useRef(false);
  
  // Initialize editor state - use memo to prevent recreation
  const editorState = useEditorState(originalContent);
  const {
    content,
    setContent,
    lineCount,
    setLineCount,
    editorInitialized,
    setEditorInitialized,
    isProcessingLinesRef,
    hasInitializedRef
  } = editorState;
  
  // Set up content flushing - memoize to prevent recreation
  const editorIntegration = useEditorIntegration({
    editorInitialized,
    content,
    setContent,
    flushContentToLineData: () => contentFlushing.flushContentToLineData()
  });
  const { quillRef, formats, modules } = editorIntegration;
  
  // Initialize content flushing - memoize to prevent recreation
  const contentFlushing = useContentFlushing(quillRef, updateLineContents);
  const { flushContentToLineData } = contentFlushing;
  
  // Initialize editor - memoize to prevent recreation
  const editorInitResult = useEditorInitialization(
    quillRef,
    lineData,
    isDataReady,
    useCallback((editor) => {
      // Only initialize once
      if (hasInitializedRef.current) {
        return true;
      }
      
      const result = initializeEditor(editor);
      setEditorInitialized(result);
      
      if (result) {
        fullyInitializedRef.current = true;
      }
      
      return result;
    }, [initializeEditor, setEditorInitialized, hasInitializedRef])
  );
  
  // Set up content update handlers - memoize to prevent recreation
  const contentUpdates = useContentUpdates(
    content,
    setContent,
    lineCount,
    setLineCount,
    editorInitialized,
    isProcessingLinesRef,
    quillRef
  );
  const { 
    contentUpdateRef, 
    handleChange, 
    updateEditorContent,
    captureCurrentContent 
  } = contentUpdates;
  
  // Placeholder for userId (will be connected in TextEditor)
  const userId = null;
  const loadDraftsForCurrentUser = useCallback(() => {
    console.log('🪝 useTextEditor: loadDraftsForCurrentUser placeholder called');
  }, []);
  
  // Manage drafts - memoize to prevent recreation
  const draftManagement = useDraftManagement(
    editorInitialized,
    userId,
    isDataReady,
    lineData,
    typeof content === 'string' ? content : '',
    quillRef,
    updateEditorContent,
    loadDraftsForCurrentUser
  );
  const { draftLoadAttempted, draftApplied } = draftManagement;

  return {
    quillRef,
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData,
    captureCurrentContent,
    formats,
    modules,
    draftLoadAttempted,
    draftApplied
  };
};
