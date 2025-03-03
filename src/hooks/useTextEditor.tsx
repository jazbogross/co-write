
import { useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { useEditorInitialization } from './useEditorInitialization';
import { useContentInitialization } from './useContentInitialization';
import { useContentUpdates } from './useContentUpdates';
import { useDraftManagement } from './useDraftManagement';

export const useTextEditor = (
  originalContent: string, 
  scriptId: string,
  quillRef: React.RefObject<ReactQuill>,
  lineData: LineData[],
  isDataReady: boolean,
  initializeEditor: (editor: any) => boolean,
  updateLineContents: (lines: any[], editor: any) => void
) => {
  // Initialize content state
  const {
    content,
    setContent,
    lineCount,
    setLineCount,
    isContentInitialized,
    isProcessingLinesRef
  } = useContentInitialization(originalContent, lineData, quillRef);
  
  // Initialize editor
  const { editorInitialized } = useEditorInitialization(
    quillRef,
    lineData,
    isDataReady,
    initializeEditor
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
  
  // Unused in this refactoring as it requires userId
  // Left as a placeholder for integration in TextEditor component
  const userId = null;
  const loadDraftsForCurrentUser = () => {};
  
  // Manage drafts (will be properly connected in TextEditor)
  const { draftLoadAttempted, draftApplied } = useDraftManagement(
    editorInitialized,
    userId,
    isDataReady,
    lineData,
    content,
    quillRef,
    updateEditorContent,
    loadDraftsForCurrentUser
  );

  // Function to update content and flush changes to line data
  const flushContentToLineData = () => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    
    const lines = editor.getLines(0);
    updateLineContents(
      lines.map(line => {
        const lineIndex = editor.getIndex(line);
        const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
        return editor.getContents(lineIndex, nextLineIndex - lineIndex);
      }),
      editor
    );
  };

  return {
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData,
    // These could be used by the parent component if needed
    draftLoadAttempted,
    draftApplied
  };
};
