
import { useState, useEffect, useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { isDeltaObject } from '@/utils/editor';

/**
 * Custom hook for handling content initialization in the editor
 */
export const useContentInitialization = ({
  quill,
  editorInitialized,
  lineData,
  initialContent,
  updateEditorContent
}: {
  quill: any;
  editorInitialized: boolean;
  lineData: LineData[];
  initialContent: string | null;
  updateEditorContent: (editor: any, content: any, forceUpdate: boolean) => void;
}) => {
  const [contentInitAttempts, setContentInitAttempts] = useState(0);
  const [contentInitialized, setContentInitialized] = useState(false);

  /**
   * Initialize the editor with content
   */
  const initializeContent = useCallback(() => {
    if (!quill || !editorInitialized || contentInitialized) {
      return;
    }

    // Track attempts to prevent infinite loops
    setContentInitAttempts(prev => prev + 1);
    
    const editor = quill.getEditor();
    if (!editor) {
      console.log('Editor not available yet');
      return;
    }
    
    // Use direct content if provided, otherwise use line data
    let content;
    if (initialContent) {
      content = initialContent;
    } else if (lineData.length > 0) {
      // Use the first line's content (Delta object)
      content = lineData[0].content;
    } else {
      // Default empty content
      content = { ops: [{ insert: '\n' }] };
    }
      
    console.log(`📝 useContentInitialization: Initializing content (attempt ${contentInitAttempts + 1})`);
    
    // Apply content update
    updateEditorContent(editor, content, true);
    
    // Mark as initialized
    setContentInitialized(true);
    
    console.log('📝 useContentInitialization: Content initialization complete');
  }, [
    quill, 
    editorInitialized,
    contentInitialized,
    lineData,
    initialContent,
    contentInitAttempts,
    updateEditorContent
  ]);

  /**
   * Reinitialize content forcefully (used for resets or drastic changes)
   */
  const reinitializeContent = useCallback(() => {
    if (!quill || !editorInitialized) {
      return;
    }
    
    const editor = quill.getEditor();
    if (!editor) return;
    
    console.log('📝 useContentInitialization: Reinitializing content forcefully');
    
    // Use direct content or first line's content
    let content;
    if (initialContent) {
      content = initialContent;
    } else if (lineData.length > 0) {
      content = lineData[0].content;
    } else {
      content = { ops: [{ insert: '\n' }] };
    }
    
    // Forcefully update content
    updateEditorContent(editor, content, true);
  }, [quill, editorInitialized, lineData, initialContent, updateEditorContent]);

  // Automatically initialize content when editor is ready
  useEffect(() => {
    if (editorInitialized && !contentInitialized && contentInitAttempts < 3) {
      initializeContent();
    }
  }, [editorInitialized, contentInitialized, contentInitAttempts, initializeContent]);

  return {
    contentInitialized,
    initializeContent,
    reinitializeContent
  };
};
