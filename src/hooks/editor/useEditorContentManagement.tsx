
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
    console.log('📝 useEditorContentManagement: updateEditorContent called with', {
      contentType: typeof newContent,
      isDelta: isDeltaObject(newContent),
      forceUpdate
    });
    
    // Prevent recursive updates
    if (isUpdatingEditorRef.current && !forceUpdate) {
      console.log('📝 useEditorContentManagement: Already updating editor, skipping recursive update');
      return;
    }
    
    if (!editor) {
      console.log('📝 useEditorContentManagement: No editor available, skipping update');
      return;
    }
    
    console.log('📝 useEditorContentManagement: Updating editor content programmatically');
    
    try {
      isUpdatingEditorRef.current = true;
      
      // Save cursor position before making changes if we have lineTracking
      if (editor.lineTracking) {
        // Notify line tracking about programmatic update
        console.log('📝 useEditorContentManagement: Setting programmatic update mode ON');
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Preserve DOM UUIDs before making any changes
      const domUuids = new Map<number, string>();
      const lines = editor.getLines(0);
      
      console.log(`📝 useEditorContentManagement: Preserving UUIDs from ${lines.length} existing lines`);
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
        console.log(`📝 useEditorContentManagement: Performing full content update`);
        editor.deleteText(0, currentLength);
        
        if (isDeltaObject(newContent)) {
          // If it's a Delta object, use setContents directly
          const delta = safelyParseDelta(newContent);
          if (delta) {
            console.log('📝 useEditorContentManagement: Setting editor contents with delta object');
            // Cast to any to work around the type issues with Quill's Delta type
            editor.setContents(delta as any);
            
            // Update content state
            setContent(delta);
          } else {
            // Fallback to plain text if Delta parsing fails
            console.log('📝 useEditorContentManagement: Delta parsing failed, falling back to plain text');
            const textContent = extractPlainTextFromDelta(newContent);
            insertContentWithLineBreaks(editor, textContent);
            
            // Update content state with text
            setContent(textContent);
          }
        } else {
          // For string content, split by newlines and insert properly
          console.log('📝 useEditorContentManagement: Handling string content');
          const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
          insertContentWithLineBreaks(editor, contentStr);
          
          // Update content state with text
          setContent(contentStr);
        }
        
        // Reset the full update flag after completing a full update
        needsFullUpdateRef.current = false;
      } else {
        // Only update content state for incremental changes
        console.log('📝 useEditorContentManagement: Updating content state only (no full editor reset)');
        setContent(newContent);
      }
      
      // Apply UUIDs to DOM elements if we did a full update
      if (shouldDoFullUpdate) {
        const updatedLines = editor.getLines(0);
        console.log(`📝 useEditorContentManagement: Restoring UUIDs to ${updatedLines.length} updated lines`);
        
        // First pass: Apply preserved UUIDs to matching positions
        let restoredCount = 0;
        updatedLines.forEach((line: any, index: number) => {
          if (line.domNode) {
            // Try to get UUID from our maps
            const uuid = domUuids.get(index) || lineTrackingUuids.get(index);
            if (uuid) {
              line.domNode.setAttribute('data-line-uuid', uuid);
              line.domNode.setAttribute('data-line-index', String(index + 1));
              restoredCount++;
            }
          }
        });
        
        console.log(`📝 useEditorContentManagement: Restored ${restoredCount} UUIDs to DOM elements`);
        
        // Ensure any lineTracking knows about the applied UUIDs
        if (editor.lineTracking && typeof editor.lineTracking.initialize === 'function') {
          console.log('📝 useEditorContentManagement: Re-initializing line tracking after UUID restoration');
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
      console.log('📝 useEditorContentManagement: Falling back to plain text insertion after error');
      insertContentWithLineBreaks(editor, textContent);
    } finally {
      // Turn off programmatic update mode
      if (editor.lineTracking) {
        console.log('📝 useEditorContentManagement: Setting programmatic update mode OFF');
        editor.lineTracking.setProgrammaticUpdate(false);
      }
      isUpdatingEditorRef.current = false;
    }
  }, [setContent]);

  // Method to mark that the next update should be a full content reset
  const markForFullContentUpdate = useCallback(() => {
    needsFullUpdateRef.current = true;
    console.log('📝 useEditorContentManagement: Marked for full content update on next change');
  }, []);

  return {
    updateEditorContent,
    isUpdatingEditorRef,
    markForFullContentUpdate
  };
};
