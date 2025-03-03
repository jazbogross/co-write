
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
      
      // Clear existing content first but preserve DOM UUIDs
      const domUuids = new Map<number, string>();
      const lines = editor.getLines(0);
      lines.forEach((line: any, index: number) => {
        if (line.domNode && line.domNode.getAttribute('data-line-uuid')) {
          domUuids.set(index, line.domNode.getAttribute('data-line-uuid'));
        }
      });
      
      const currentLength = editor.getLength();
      console.log(`📝 useEditorContentManagement: Clearing existing content (length: ${currentLength})`);
      editor.deleteText(0, currentLength);
      
      if (isDeltaObject(newContent)) {
        // If it's a Delta object, use setContents directly
        const delta = safelyParseDelta(newContent);
        if (delta) {
          console.log('📝 useEditorContentManagement: Setting editor contents with delta object, ops:', delta.ops.length);
          // Cast to any to work around the type issues with Quill's Delta type
          editor.setContents(delta as any);
          
          // Update content state
          setContent(delta);
          console.log('📝 useEditorContentManagement: Content state updated with delta');
        } else {
          // Fallback to plain text if Delta parsing fails
          console.log('📝 useEditorContentManagement: Delta parsing failed, falling back to plain text');
          const textContent = extractPlainTextFromDelta(newContent);
          insertContentWithLineBreaks(editor, textContent);
          
          // Update content state with text
          setContent(textContent);
          console.log('📝 useEditorContentManagement: Content state updated with text');
        }
      } else {
        // For string content, split by newlines and insert properly
        console.log('📝 useEditorContentManagement: Handling string content');
        const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
        insertContentWithLineBreaks(editor, contentStr);
        
        // Update content state with text
        setContent(contentStr);
        console.log('📝 useEditorContentManagement: Content state updated with text');
      }
      
      // Restore UUIDs to DOM elements
      const updatedLines = editor.getLines(0);
      updatedLines.forEach((line: any, index: number) => {
        if (domUuids.has(index) && line.domNode) {
          line.domNode.setAttribute('data-line-uuid', domUuids.get(index) || '');
        }
      });
      
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

  return {
    updateEditorContent,
    isUpdatingEditorRef
  };
};
