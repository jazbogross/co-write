
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
      contentPreview: typeof newContent === 'string' 
        ? newContent.substring(0, 30) + '...' 
        : JSON.stringify(newContent).substring(0, 30) + '...',
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
      
      // Set the line tracker to programmatic update mode
      if (editor.lineTracking) {
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
            console.log(`📝 useEditorContentManagement: Preserved UUID ${uuid} from line ${index + 1}`);
          }
        }
      });
      
      // Get UUIDs from lineTracking as well to ensure we have as many as possible
      let lineTrackingUuids = new Map<number, string>();
      if (editor.lineTracking && typeof editor.lineTracking.getDomUuidMap === 'function') {
        try {
          lineTrackingUuids = editor.lineTracking.getDomUuidMap();
          console.log(`📝 useEditorContentManagement: Got ${lineTrackingUuids.size} UUIDs from lineTracking`);
        } catch (error) {
          console.error('📝 useEditorContentManagement: Error getting UUIDs from lineTracking:', error);
        }
      }
      
      // Merge UUIDs from both sources
      for (const [index, uuid] of lineTrackingUuids.entries()) {
        if (!domUuids.has(index)) {
          domUuids.set(index, uuid);
          console.log(`📝 useEditorContentManagement: Added UUID ${uuid} from lineTracking for line ${index + 1}`);
        }
      }
      
      const currentLength = editor.getLength();
      console.log(`📝 useEditorContentManagement: Clearing existing content (length: ${currentLength})`);
      editor.deleteText(0, currentLength);
      
      if (isDeltaObject(newContent)) {
        // If it's a Delta object, use setContents directly
        const delta = safelyParseDelta(newContent);
        if (delta) {
          console.log('📝 useEditorContentManagement: Setting editor contents with delta object, ops:', delta.ops.length);
          editor.setContents(delta as any);
          
          // Update content state
          setContent(delta);
          console.log('📝 useEditorContentManagement: Content state updated with delta');
        } else {
          // Fallback to plain text if Delta parsing fails
          console.log('📝 useEditorContentManagement: Delta parsing failed, falling back to plain text');
          const textContent = extractPlainTextFromDelta(newContent);
          insertContentWithLineBreaks(editor, textContent || '');
          
          // Update content state with text
          setContent(textContent || '');
          console.log('📝 useEditorContentManagement: Content state updated with text');
        }
      } else if (typeof newContent === 'string' && newContent.startsWith('{') && newContent.includes('"ops"')) {
        // Handle stringified Delta objects by parsing and setting
        try {
          const parsedDelta = JSON.parse(newContent);
          if (parsedDelta && Array.isArray(parsedDelta.ops)) {
            console.log('📝 useEditorContentManagement: Parsed stringified Delta, applying to editor');
            editor.setContents(parsedDelta);
            
            // Update content state with parsed Delta
            setContent(parsedDelta);
            console.log('📝 useEditorContentManagement: Content state updated with parsed Delta');
          } else {
            throw new Error('Invalid Delta structure');
          }
        } catch (error) {
          console.error('📝 useEditorContentManagement: Error parsing stringified Delta:', error);
          insertContentWithLineBreaks(editor, newContent);
          setContent(newContent);
        }
      } else {
        // For string content, split by newlines and insert properly
        console.log('📝 useEditorContentManagement: Handling string content');
        const contentStr = typeof newContent === 'string' ? newContent : String(newContent || '');
        insertContentWithLineBreaks(editor, contentStr);
        
        // Update content state with text
        setContent(contentStr);
        console.log('📝 useEditorContentManagement: Content state updated with text');
      }
      
      // Apply UUIDs to DOM elements
      const updatedLines = editor.getLines(0);
      console.log(`📝 useEditorContentManagement: Restoring UUIDs to ${updatedLines.length} updated lines`);
      
      // First pass: Apply preserved UUIDs to matching positions
      let restoredCount = 0;
      updatedLines.forEach((line: any, index: number) => {
        if (line.domNode && domUuids.has(index)) {
          const uuid = domUuids.get(index);
          line.domNode.setAttribute('data-line-uuid', uuid || '');
          line.domNode.setAttribute('data-line-index', String(index + 1));
          restoredCount++;
        }
      });
      
      console.log(`📝 useEditorContentManagement: Restored ${restoredCount} UUIDs to DOM elements`);
      
      // Ensure any lineTracking knows about the applied UUIDs
      if (editor.lineTracking && typeof editor.lineTracking.initialize === 'function') {
        console.log('📝 useEditorContentManagement: Re-initializing line tracking after UUID restoration');
        editor.lineTracking.initialize();
      }
      
      // Log line UUIDs after update
      if (updatedLines.length > 0) {
        updatedLines.slice(0, 3).forEach((line: any, i: number) => {
          if (line.domNode) {
            const uuid = line.domNode.getAttribute('data-line-uuid');
            console.log(`📝 After update - Line ${i+1} UUID from DOM: ${uuid || 'missing'}`);
          }
        });
      }
      
    } catch (error) {
      console.error('📝 useEditorContentManagement: Error updating editor content:', error);
      
      const textContent = typeof newContent === 'string' 
        ? newContent 
        : extractPlainTextFromDelta(newContent) || JSON.stringify(newContent || '');
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

  return {
    updateEditorContent,
    isUpdatingEditorRef
  };
};
