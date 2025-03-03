
import { useRef } from 'react';
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
  console.log('🪝 useTextEditor: Hook called with', { 
    scriptId, 
    lineDataLength: lineData.length, 
    isDataReady
  });
  
  // Initialize editor state
  const {
    content,
    setContent,
    lineCount,
    setLineCount,
    editorInitialized,
    setEditorInitialized,
    isProcessingLinesRef
  } = useEditorState(originalContent);
  
  // Set up content flushing
  const { quillRef, formats, modules, flushContent } = useEditorIntegration({
    editorInitialized,
    content,
    setContent,
    flushContentToLineData: () => contentFlushing.flushContentToLineData()
  });
  
  // Initialize content flushing
  const contentFlushing = useContentFlushing(quillRef, updateLineContents);
  const { flushContentToLineData } = contentFlushing;
  
  // Initialize editor
  const { editorInitialized: editorInitResult } = useEditorInitialization(
    quillRef,
    lineData,
    isDataReady,
    (editor) => {
      const result = initializeEditor(editor);
      setEditorInitialized(result);
      return result;
    }
  );
  
  // Set up content update handlers
  const {
    contentUpdateRef,
    handleChange,
    updateEditorContent
  } = useContentUpdates(
    content,
    setContent,
    lineCount,
    setLineCount,
    editorInitialized,
    isProcessingLinesRef,
    quillRef
  );
  
  // Placeholder for userId (will be connected in TextEditor)
  const userId = null;
  const loadDraftsForCurrentUser = () => {
    console.log('🪝 useTextEditor: loadDraftsForCurrentUser placeholder called');
  };
  
  // Manage drafts (will be properly connected in TextEditor)
  const { draftLoadAttempted, draftApplied } = useDraftManagement(
    editorInitialized,
    userId,
    isDataReady,
    lineData,
    typeof content === 'string' ? content : '',
    quillRef,
    updateEditorContent,
    loadDraftsForCurrentUser
  );

  console.log('🪝 useTextEditor: Hook state', { 
    contentType: typeof content, 
    isDelta: isDeltaObject(content),
    lineCount, 
    editorInitialized,
    draftApplied
  });

  return {
    quillRef,
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData,
    formats,
    modules,
    draftLoadAttempted,
    draftApplied
  };
};
