
import { useState, useEffect, useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { reconstructContent } from '@/utils/editor';

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
    
    // Use direct content if provided, otherwise reconstruct from line data
    const content = initialContent || (lineData.length > 0 
      ? reconstructContent(lineData) 
      : '');
      
    console.log(`📝 useContentInitialization: Initializing content (attempt ${contentInitAttempts + 1})`, 
                `lineData length: ${lineData.length}`);
    
    // Save cursor position if we have lineTracking
    if (editor.lineTracking && typeof editor.lineTracking.saveCursorPosition === 'function') {
      editor.lineTracking.saveCursorPosition();
    }
    
    // Apply content update
    updateEditorContent(editor, content, true);
    
    // Mark as initialized
    setContentInitialized(true);
    
    // Restore cursor position if we have lineTracking
    if (editor.lineTracking && typeof editor.lineTracking.restoreCursorPosition === 'function') {
      editor.lineTracking.restoreCursorPosition();
    }
    
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
    
    // Save cursor position if we have lineTracking
    if (editor.lineTracking && typeof editor.lineTracking.saveCursorPosition === 'function') {
      editor.lineTracking.saveCursorPosition();
    }
    
    console.log('📝 useContentInitialization: Reinitializing content forcefully');
    
    // Forcefully update content
    updateEditorContent(editor, initialContent || reconstructContent(lineData), true);
    
    // Restore cursor position if we have lineTracking
    if (editor.lineTracking && typeof editor.lineTracking.restoreCursorPosition === 'function') {
      editor.lineTracking.restoreCursorPosition();
    }
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
