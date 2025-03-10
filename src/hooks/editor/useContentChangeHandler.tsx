
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
          
          // Let LineTracking assign UUIDs and check for duplicates after a brief delay
          pendingUUIDAssignmentRef.current = true;
          
          // Schedule a check to verify UUIDs were assigned correctly
          setTimeout(() => {
            const verifiedLines = editor.getLines(0);
            verifyLineUUIDs(editor, verifiedLines);
            pendingUUIDAssignmentRef.current = false;
          }, 50);
        } else {
          // Fallback: Manually assign UUIDs to new lines
          console.log(`📝 useContentChangeHandler: Manually assigning UUIDs to new lines`);
          newLines.forEach((line, index) => {
            if (line.domNode) {
              // Get current UUID if it exists
              const currentUuid = line.domNode.getAttribute('data-line-uuid');
              
              // Check if this UUID is already used by another line
              const isDuplicateUuid = currentUuid ? isDuplicateUUID(lines, currentUuid, lastLineCountRef.current + index) : false;
              
              // Only assign a new UUID if one doesn't exist or is a duplicate
              if (!currentUuid || isDuplicateUuid) {
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

  // Helper function to check if a UUID is duplicated across lines
  const isDuplicateUUID = (lines: any[], uuid: string, currentLineIndex: number): boolean => {
    let count = 0;
    let firstIndex = -1;
    
    lines.forEach((line, index) => {
      if (line.domNode && line.domNode.getAttribute('data-line-uuid') === uuid) {
        count++;
        if (firstIndex === -1) {
          firstIndex = index;
        }
      }
    });
    
    // UUID is duplicated if it appears more than once
    // OR if it appears exactly once but not at the current line (suggests inheritance)
    return count > 1 || (count === 1 && firstIndex !== currentLineIndex);
  };

  // Helper function to verify that all lines have UUIDs after changes
  const verifyLineUUIDs = (editor: any, lines: any[]) => {
    const uuids = new Set<string>();
    const duplicates = new Set<number>();
    let missingUUIDs = 0;
    
    // First pass: collect UUIDs and identify lines with missing or duplicate UUIDs
    lines.forEach((line, index) => {
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        
        if (!uuid) {
          missingUUIDs++;
        } else if (uuids.has(uuid)) {
          // Duplicate UUID found
          duplicates.add(index);
        } else {
          uuids.add(uuid);
        }
      }
    });
    
    // Second pass: fix missing or duplicate UUIDs
    lines.forEach((line, index) => {
      if (line.domNode) {
        const needsNewUuid = !line.domNode.getAttribute('data-line-uuid') || duplicates.has(index);
        
        if (needsNewUuid) {
          const newUUID = uuidv4();
          line.domNode.setAttribute('data-line-uuid', newUUID);
          console.log(`📝 verifyLineUUIDs: ${duplicates.has(index) ? 'Fixed duplicate' : 'Assigned missing'} UUID ${newUUID} to line ${index + 1}`);
        }
        
        // Always ensure line index attribute is set
        line.domNode.setAttribute('data-line-index', String(index + 1));
      }
    });
    
    const totalFixed = missingUUIDs + duplicates.size;
    if (totalFixed > 0) {
      console.log(`📝 verifyLineUUIDs: Fixed ${missingUUIDs} missing and ${duplicates.size} duplicate UUIDs`);
      
      // If we have LineTracking, update its UUID mapping
      if (editor.lineTracking && typeof editor.lineTracking.forceRefreshUuids === 'function') {
        setTimeout(() => {
          editor.lineTracking.forceRefreshUuids();
        }, 50);
      }
    }
  };

  return {
    contentUpdateRef,
    handleChange,
    lastLineCountRef,
    lastLineUUIDsRef,
    pendingUUIDAssignmentRef,
    verifyLineUUIDs
  };
};
