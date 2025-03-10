
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
  const pendingUUIDAssignmentRef = useRef<boolean>(false);
  
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
      
      // Determine if lines were added or removed
      if (currentLineCount > lastLineCountRef.current) {
        // Lines were added
        const newLines = lines.slice(lastLineCountRef.current);
        const newUUIDs: string[] = [];
        
        // Check if we can use LineTracking's built-in UUID assignment
        if (editor.lineTracking) {
          console.log(`📝 useContentChangeHandler: Deferring to LineTracking for UUID assignment`);
          
          // Do nothing here - let LineTracking assign UUIDs
          // The LineTrackerEventHandler will handle this
          pendingUUIDAssignmentRef.current = true;
          
          // Schedule a check to verify UUIDs were assigned correctly
          setTimeout(() => {
            verifyLineUUIDs(editor, lines);
            pendingUUIDAssignmentRef.current = false;
          }, 50);
        } else {
          // Fallback: Manually assign UUIDs to new lines
          console.log(`📝 useContentChangeHandler: Manually assigning UUIDs to new lines`);
          newLines.forEach((line, index) => {
            if (line.domNode) {
              // Get current UUID if it exists
              const currentUuid = line.domNode.getAttribute('data-line-uuid');
              
              // Only assign a new UUID if one doesn't exist
              if (!currentUuid) {
                const newUUID = uuidv4();
                line.domNode.setAttribute('data-line-uuid', newUUID);
                newUUIDs.push(newUUID);
                console.log(`📝 useContentChangeHandler: Assigned new UUID ${newUUID} to line ${lastLineCountRef.current + index + 1}`);
              } else {
                console.log(`📝 useContentChangeHandler: Line ${lastLineCountRef.current + index + 1} already has UUID ${currentUuid}`);
                newUUIDs.push(currentUuid);
              }
            }
          });
        }
        
        // Update line UUIDs reference with any new assignments
        lastLineUUIDsRef.current = [...lastLineUUIDsRef.current, ...newUUIDs];
      } else if (currentLineCount < lastLineCountRef.current) {
        // Lines were removed - update our UUID tracking
        lastLineUUIDsRef.current = lastLineUUIDsRef.current.slice(0, currentLineCount);
      }
      
      // Update line count reference
      lastLineCountRef.current = currentLineCount;
      
      // Log lines if debugging needed
      if (lines.length > 0) {
        lines.slice(0, Math.min(lines.length, 3)).forEach((line: any, i: number) => {
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

  // Helper function to verify that all lines have UUIDs after changes
  const verifyLineUUIDs = (editor: any, lines: any[]) => {
    let missingUUIDs = 0;
    
    lines.forEach((line, index) => {
      if (line.domNode && !line.domNode.getAttribute('data-line-uuid')) {
        missingUUIDs++;
        
        // If a line is missing a UUID, generate one
        const newUUID = uuidv4();
        line.domNode.setAttribute('data-line-uuid', newUUID);
        console.log(`📝 verifyLineUUIDs: Assigned missing UUID ${newUUID} to line ${index + 1}`);
      }
    });
    
    if (missingUUIDs > 0) {
      console.log(`📝 verifyLineUUIDs: Found and fixed ${missingUUIDs} lines with missing UUIDs`);
    }
  };

  return {
    contentUpdateRef,
    handleChange,
    lastLineCountRef,
    lastLineUUIDsRef,
    pendingUUIDAssignmentRef
  };
};
