
import { useState, useCallback, useRef } from 'react';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject, safelyParseDelta, convertToDelta } from '@/utils/editor';

/**
 * Hook to manage content state for the editor
 */
export const useEditorContentManagement = (initialContent: string | object) => {
  // Convert initial content to object if it's a string
  const initialContentObj = typeof initialContent === 'string' 
    ? (initialContent.trim() ? convertToDelta(initialContent) : { ops: [{ insert: '\n' }] })
    : initialContent;
  
  // Track content as state
  const [content, setContent] = useState<object>(initialContentObj);
  
  // Store the last applied content for comparison
  const lastAppliedContentRef = useRef<string>('');
  
  // Flag to track if an editor update is in progress
  const isUpdatingEditorRef = useRef<boolean>(false);
  
  // Flag to force a full content update
  const needsFullUpdateRef = useRef<boolean>(false);
  
  // Update content state
  const updateContent = useCallback((newContent: string | object) => {
    if (!newContent) {
      console.log('Empty content provided to updateContent, using default');
      setContent({ ops: [{ insert: '\n' }] });
      return;
    }
    
    // For string content, check if it's JSON and needs parsing
    if (typeof newContent === 'string') {
      try {
        if (newContent.trim().startsWith('{') && newContent.includes('ops')) {
          const parsed = JSON.parse(newContent);
          if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
            setContent(parsed);
            return;
          }
        }
        // Not a Delta JSON string, convert to Delta object
        setContent(convertToDelta(newContent));
      } catch (e) {
        console.error('Error parsing content string:', e);
        setContent(convertToDelta(newContent));
      }
    } else {
      // Already an object, verify it's a valid Delta
      if (isDeltaObject(newContent)) {
        setContent(newContent);
      } else {
        console.warn('Invalid Delta object provided, converting');
        setContent(convertToDelta(newContent));
      }
    }
  }, []);
  
  // Mark content for a full update (used when initializing or forcing an update)
  const markForFullContentUpdate = useCallback(() => {
    console.log('Marking content for full update');
    needsFullUpdateRef.current = true;
  }, []);
  
  // For direct string to editor application
  const applyContentToEditor = useCallback((editor: any, newContent: string | object) => {
    if (!editor) {
      console.error('No editor provided to applyContentToEditor');
      return false;
    }
    
    if (!newContent) {
      console.warn('No content to apply to editor');
      return false;
    }
    
    try {
      // Set updating flag to prevent feedback loops
      isUpdatingEditorRef.current = true;
      
      // Get appropriate Delta object
      let deltaContent: any;
      
      if (typeof newContent === 'string') {
        if (newContent.trim().startsWith('{') && newContent.includes('ops')) {
          // Try parsing as Delta JSON
          deltaContent = safelyParseDelta(newContent);
          if (!deltaContent) {
            // Could not parse as Delta, convert to Delta
            deltaContent = convertToDelta(newContent);
          }
        } else {
          // Simple string content
          deltaContent = convertToDelta(newContent);
        }
      } else if (isDeltaObject(newContent)) {
        // Already a Delta object
        deltaContent = newContent;
      } else {
        // Convert to Delta
        deltaContent = convertToDelta(newContent);
      }
      
      // Store current contents
      const currentContent = editor.getContents();
      const currentText = JSON.stringify(currentContent);
      const newText = JSON.stringify(deltaContent);
      
      // Apply if forced or content is different
      if (needsFullUpdateRef.current || currentText !== newText) {
        console.log('Applying new content to editor (forced update:', needsFullUpdateRef.current, ')');
        editor.setContents(deltaContent);
        lastAppliedContentRef.current = newText;
        needsFullUpdateRef.current = false;
        return true;
      } else {
        console.log('Content unchanged, not reapplying to editor');
        return false;
      }
    } catch (e) {
      console.error('Error applying content to editor:', e);
      return false;
    } finally {
      // Reset updating flag
      isUpdatingEditorRef.current = false;
    }
  }, []);
  
  return {
    content,
    updateContent,
    applyContentToEditor,
    lastAppliedContentRef,
    isUpdatingEditorRef,
    markForFullContentUpdate
  };
};
