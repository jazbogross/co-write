
import { useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { useEditorInitialization } from './useEditorInitialization';
import { useContentInitialization } from './useContentInitialization';
import { useContentUpdates } from './useContentUpdates';
import { useDraftManagement } from './useDraftManagement';
import { EDITOR_MODULES } from '@/components/editor/LineTrackingModule';
import { isDeltaObject } from '@/utils/editor';

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
  
  // Create quill reference
  const quillRef = useRef<ReactQuill>(null);
  
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
  const loadDraftsForCurrentUser = () => {
    console.log('🪝 useTextEditor: loadDraftsForCurrentUser placeholder called');
  };
  
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
    console.log('🪝 useTextEditor: flushContentToLineData called');
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.log('🪝 useTextEditor: No editor available for flushing content');
      return;
    }
    
    // Get all lines from the editor
    const lines = editor.getLines(0);
    console.log(`🪝 useTextEditor: Flushing current editor content to line data (${lines.length} lines)`);
    
    // Extract content for each line
    const lineContents = lines.map((line: any, index: number) => {
      const lineIndex = editor.getIndex(line);
      const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
      
      // Get the Delta object for this line range
      const delta = editor.getContents(lineIndex, nextLineIndex - lineIndex);
      
      // Log line DOM properties
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        console.log(`🪝 Line ${index+1} UUID from DOM: ${uuid || 'missing'}, delta ops: ${delta.ops.length}`);
      } else {
        console.log(`🪝 Line ${index+1} has no domNode, delta ops: ${delta.ops.length}`);
      }
      
      return delta;
    });
    
    console.log(`🪝 useTextEditor: Extracted ${lineContents.length} line contents`);
    
    try {
      // Pass to updateLineContents to update the lineData state with the new content
      updateLineContents(lineContents, editor);
      console.log('🪝 useTextEditor: Updated line contents successfully');
    } catch (error) {
      console.error('🪝 useTextEditor: Error updating line contents:', error);
    }
  };

  const formats = ['bold', 'italic', 'align'];
  const modules = EDITOR_MODULES;

  console.log('🪝 useTextEditor: Hook state', { 
    contentType: typeof content, 
    isDelta: isDeltaObject(content),
    lineCount, 
    editorInitialized,
    isContentInitialized,
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
    // These could be used by the parent component if needed
    draftLoadAttempted,
    draftApplied
  };
};
