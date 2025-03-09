
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
      return;
    }
    
    try {
      isUpdatingEditorRef.current = true;
      
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
        editor.deleteText(0, currentLength);
        
        if (isDeltaObject(newContent)) {
          // If it's a Delta object, use setContents directly
          const delta = safelyParseDelta(newContent);
          if (delta) {
            // Cast to any to work around the type issues with Quill's Delta type
            editor.setContents(delta as any);
          } else {
            // Fallback to plain text if Delta parsing fails
            const textContent = extractPlainTextFromDelta(newContent);
            insertContentWithLineBreaks(editor, textContent);
          }
        } else {
          // For string content, split by newlines and insert properly
          const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
          insertContentWithLineBreaks(editor, contentStr);
        }
        
        // Reset the full update flag after completing a full update
        needsFullUpdateRef.current = false;
      }
      
      // Apply UUIDs to DOM elements if we did a full update
      if (shouldDoFullUpdate) {
        const updatedLines = editor.getLines(0);
        
        // First pass: Apply preserved UUIDs to matching positions
        updatedLines.forEach((line: any, index: number) => {
          if (line.domNode) {
            // Try to get UUID from our maps
            const uuid = domUuids.get(index) || lineTrackingUuids.get(index);
            if (uuid) {
              line.domNode.setAttribute('data-line-uuid', uuid);
              line.domNode.setAttribute('data-line-index', String(index + 1));
            }
          }
        });
        
        // Ensure any lineTracking knows about the applied UUIDs
        if (editor.lineTracking && typeof editor.lineTracking.initialize === 'function') {
          editor.lineTracking.initialize();
        }
      }
      
    } catch (error) {
      console.error('📝 useEditorContentManagement: Error updating editor content:', error);
      
      // On error, force a full update next time
      needsFullUpdateRef.current = true;
      
      const textContent = typeof newContent === 'string' 
        ? newContent 
        : extractPlainTextFromDelta(newContent) || JSON.stringify(newContent);
      insertContentWithLineBreaks(editor, textContent);
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
