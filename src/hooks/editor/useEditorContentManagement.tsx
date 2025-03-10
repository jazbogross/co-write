
import { useCallback, useRef } from 'react';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';
import { insertContentWithLineBreaks } from '@/utils/editor/content/insertionUtils';

/**
 * Hook to handle updating editor content programmatically
 */
export const useEditorContentManagement = (
  setContent: (content: string | DeltaContent) => void
) => {
  // Prevent recursive updates
  const isUpdatingEditorRef = useRef(false);
  const needsFullUpdateRef = useRef(false);
  const updateAttemptCountRef = useRef(0);

  /**
   * Updates editor content programmatically
   */
  const updateEditorContent = useCallback((
    editor: any,
    newContent: string | DeltaContent, 
    forceUpdate: boolean = false
  ) => {
    // Prevent recursive updates
    if (isUpdatingEditorRef.current && !forceUpdate) {
      return;
    }
    
    if (!editor) {
      console.error('📝 useEditorContentManagement: Editor not available');
      return;
    }
    
    // Skip empty content updates unless forced
    if (!forceUpdate && 
        ((typeof newContent === 'string' && newContent === '') ||
         (isDeltaObject(newContent) && 
          (!('ops' in newContent) || !newContent.ops || newContent.ops.length === 0)))) {
      console.log('📝 useEditorContentManagement: Skipping empty content update');
      return;
    }
    
    // Track update attempts for validation
    updateAttemptCountRef.current++;
    const currentAttempt = updateAttemptCountRef.current;
    
    try {
      isUpdatingEditorRef.current = true;
      
      console.log(`📝 useEditorContentManagement: Updating content (attempt ${currentAttempt}), force=${forceUpdate}, type=${typeof newContent}`);
      
      // Save cursor position before making changes if we have lineTracking
      if (editor.lineTracking) {
        // Notify line tracking about programmatic update
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Preserve DOM UUIDs before making any changes
      const domUuids = new Map<number, string>();
      const lines = editor.getLines(0);
      
      lines.forEach((line: any, index: number) => {
        if (line.domNode) {
          const uuid = line.domNode.getAttribute('data-line-uuid');
          if (uuid) {
            domUuids.set(index, uuid);
          }
        }
      });
      
      // Get UUIDs from lineTracking as well to ensure we have as many as possible
      let lineTrackingUuids = new Map<number, string>();
      if (editor.lineTracking && typeof editor.lineTracking.getDomUuidMap === 'function') {
        try {
          lineTrackingUuids = editor.lineTracking.getDomUuidMap();
        } catch (error) {
          console.error('📝 useEditorContentManagement: Error getting UUIDs from lineTracking:', error);
        }
      }
      
      // Determine if we need a full update or an incremental update
      const currentLength = editor.getLength();
      const shouldDoFullUpdate = forceUpdate || needsFullUpdateRef.current || currentLength <= 1;
      
      // For draft loading and initial loads, do a full update
      if (shouldDoFullUpdate) {
        console.log(`📝 useEditorContentManagement: Performing full content update, length=${currentLength}`);
        
        // Delete all content before setting new content
        editor.deleteText(0, currentLength);
        
        if (isDeltaObject(newContent)) {
          // If it's a Delta object, use setContents directly
          const delta = safelyParseDelta(newContent);
          if (delta) {
            console.log(`📝 useEditorContentManagement: Setting content using Delta with ${delta.ops.length} ops`);
            editor.setContents(delta as any);
          } else {
            // Fallback to plain text if Delta parsing fails
            console.log(`📝 useEditorContentManagement: Delta parsing failed, using plain text fallback`);
            const textContent = extractPlainTextFromDelta(newContent);
            insertContentWithLineBreaks(editor, textContent);
          }
        } else {
          // For string content, split by newlines and insert properly
          console.log(`📝 useEditorContentManagement: Setting content using string`);
          const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
          insertContentWithLineBreaks(editor, contentStr);
        }
        
        // Reset the full update flag after completing a full update
        needsFullUpdateRef.current = false;
      }
      
      // Apply UUIDs to DOM elements if we did a full update
      if (shouldDoFullUpdate) {
        const updatedLines = editor.getLines(0);
        console.log(`📝 useEditorContentManagement: Content updated, found ${updatedLines.length} lines`);
        
        // First pass: Apply preserved UUIDs to matching positions
        updatedLines.forEach((line: any, index: number) => {
          if (line.domNode) {
            // Try to get UUID from our maps
            const uuid = domUuids.get(index) || lineTrackingUuids.get(index);
            if (uuid) {
              line.domNode.setAttribute('data-line-uuid', uuid);
              line.domNode.setAttribute('data-line-index', String(index + 1));
              console.log(`📝 useEditorContentManagement: Applied UUID ${uuid} to line ${index + 1}`);
            }
          }
        });
        
        // Ensure any lineTracking knows about the applied UUIDs
        if (editor.lineTracking && typeof editor.lineTracking.initialize === 'function') {
          editor.lineTracking.initialize();
        }
        
        // Set the React state to match the editor content
        setContent(newContent);
      }
      
      // Verify the update was successful
      setTimeout(() => {
        if (editor) {
          const verifyLines = editor.getLines(0);
          console.log(`📝 useEditorContentManagement: Verification after update (attempt ${currentAttempt}): found ${verifyLines.length} lines`);
          
          // If Delta content should have multiple lines but we only have one, something went wrong
          if (isDeltaObject(newContent) && 
              ('ops' in newContent) && newContent.ops && 
              newContent.ops.length > 1 && verifyLines.length <= 1) {
            console.log(`📝 useEditorContentManagement: Content update verification failed, will retry on next update`);
            needsFullUpdateRef.current = true;
          }
        }
      }, 50);
      
    } catch (error) {
      console.error('📝 useEditorContentManagement: Error updating editor content:', error);
      
      // On error, force a full update next time
      needsFullUpdateRef.current = true;
      
      try {
        // Try plain text fallback on error
        const textContent = typeof newContent === 'string' 
          ? newContent 
          : extractPlainTextFromDelta(newContent as DeltaContent) || JSON.stringify(newContent);
        insertContentWithLineBreaks(editor, textContent);
      } catch (fallbackError) {
        console.error('📝 useEditorContentManagement: Fallback insert failed:', fallbackError);
      }
    } finally {
      // Turn off programmatic update mode
      if (editor.lineTracking) {
        editor.lineTracking.setProgrammaticUpdate(false);
      }
      isUpdatingEditorRef.current = false;
    }
  }, [setContent]);

  // Method to mark that the next update should be a full content reset
  const markForFullContentUpdate = useCallback(() => {
    needsFullUpdateRef.current = true;
  }, []);

  return {
    updateEditorContent,
    isUpdatingEditorRef,
    markForFullContentUpdate
  };
};
