
import { useCallback, useRef } from 'react';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';
import { v4 as uuidv4 } from 'uuid';
import { isDeltaObject } from '@/utils/editor';

/*************  ✨ Codeium Command 🌟  *************/
/**
 * Hook to handle content changes in the editor
 */
export const useContentChangeHandler = (
  editorInitialized: boolean,
  quillRef: React.RefObject<ReactQuill>,
  setContent: (content: string | DeltaContent) => void,
  isProcessingLinesRef: React.MutableRefObject<boolean>,
  isUpdatingEditorRef: React.MutableRefObject<boolean>
) => {
  const contentUpdateRef = useRef(false);
  const lastContentRef = useRef<string | null>(null);
  const lastLineCountRef = useRef<number>(0);
  const lastLineUUIDsRef = useRef<string[]>([]);
  
  const handleChange = useCallback((newContent: string | DeltaContent, delta?: any, source?: string) => {
    // Skip processing if source is not 'user' (i.e., it's a programmatic change)
    if (source && source !== 'user') {
      return;
    }
    
    if (!editorInitialized) {
      return;
    }
    
    if (isProcessingLinesRef.current || isUpdatingEditorRef.current) {
      return;
    }
    
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      return;
    }

    // Check if this is a structural change that affects line count
    const lines = editor.getLines(0);
    const currentLineCount = lines.length;
    const isLineCountChange = currentLineCount !== lastLineCountRef.current;
    
    // Only process changes that affect line structure or on explicit save actions
    if (isLineCountChange) {
      console.log(`📝 useContentChangeHandler: Line count changed: ${lastLineCountRef.current} -> ${currentLineCount}`);
      
      // Get the actual Delta content from the editor to preserve formatting
      const editorDelta = editor.getContents();
      
      // Convert editor Delta to our DeltaContent type
      const convertedDelta: DeltaContent = {
        ops: editorDelta.ops.map(op => ({
          ...op,
          insert: op.insert || ''
        }))
      };
      
      // Only update React state for line structure changes
      setContent(convertedDelta);
      
      // Assign UUIDs to new lines
      const newLines = lines.slice(lastLineCountRef.current);
      const newUUIDs: string[] = [];
      newLines.forEach(line => {
        const uuid = line.domNode?.getAttribute('data-line-uuid');
        if (!uuid) {
          const newUUID = uuidv4();
          line.domNode?.setAttribute('data-line-uuid', newUUID);
          newUUIDs.push(newUUID);
        }
      });
      
      // Update line count reference
      lastLineCountRef.current = currentLineCount;
      
      // Update line UUIDs reference
      lastLineUUIDsRef.current = [...lastLineUUIDsRef.current, ...newUUIDs];
      
      // Log lines if debugging needed
      if (lines.length > 0) {
        lines.slice(0, 3).forEach((line: any, i: number) => {
          if (line.domNode) {
            const uuid = line.domNode.getAttribute('data-line-uuid');
            console.log(`📝 Line ${i+1} UUID from DOM: ${uuid || 'missing'}`);
          }
        });
      }
    }
    
    return { 
      editor,
      lines,
      isLineCountChange
    };
  }, [editorInitialized, quillRef, setContent, isProcessingLinesRef, isUpdatingEditorRef]);

  return {
    contentUpdateRef,
    handleChange,
    lastLineCountRef,
    lastLineUUIDsRef
  };
};
/******  3d3a8796-070a-416a-bfaf-12322270e14f  *******/
