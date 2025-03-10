
import { useCallback, useEffect, useRef, useState } from 'react';
import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta, DeltaContent } from '@/utils/editor';

export type ContentChangeOptions = {
  shouldFlush?: boolean;
  isExternalUpdate?: boolean;
};

/**
 * Custom hook to manage editor content changes and line data updates
 */
export const useEditorContentManagement = (
  quillRef: React.RefObject<any>,
  lineData: LineData[],
  updateLineContents: (contents: any[], quill: any) => void,
  isInitialized: boolean
) => {
  const [isProcessingContent, setIsProcessingContent] = useState(false);
  const lastProcessedContentRef = useRef<string | DeltaContent | null>(null);
  const contentUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Process content changes and update line data
   */
  const processContentChange = useCallback((
    newContent: string | DeltaContent,
    options: ContentChangeOptions = {}
  ) => {
    if (!quillRef.current || !isInitialized) return;
    
    const editor = quillRef.current.getEditor();
    if (!editor) return;
    
    // Type safety: Check if newContent is a string or Delta
    if (typeof newContent !== 'string' && !isDeltaObject(newContent)) {
      console.error('Invalid content type:', typeof newContent);
      return;
    }
    
    setIsProcessingContent(true);
    
    try {
      // If content is a string and didn't change, skip processing
      if (
        typeof newContent === 'string' &&
        typeof lastProcessedContentRef.current === 'string' &&
        newContent === lastProcessedContentRef.current
      ) {
        return;
      }
      
      // If content is a Delta and didn't change, skip processing
      if (
        isDeltaObject(newContent) &&
        isDeltaObject(lastProcessedContentRef.current) &&
        JSON.stringify(newContent) === JSON.stringify(lastProcessedContentRef.current)
      ) {
        return;
      }
      
      // Update the editor if it's an external update
      if (options.isExternalUpdate) {
        if (isDeltaObject(newContent)) {
          editor.setContents(newContent);
        } else {
          editor.setText(newContent);
        }
      }
      
      // Extract lines from editor
      const lines = editor.getLines(0);
      if (lines.length === 0) {
        const emptyContent = editor.getText() || '';
        updateLineContents([emptyContent], editor);
        return;
      }
      
      // Get content from each line
      const lineContents = lines.map((line: any) => {
        // Get line format
        const lineFormat = editor.getFormat(line.offset());
        
        // Get line content as operations
        const ops = editor.getContents(line.offset(), line.length()).ops;
        
        // Return Delta content
        return { ops };
      });
      
      // Only update line data if should flush or if content changed significantly
      if (options.shouldFlush || contentChangedSignificantly(newContent, lastProcessedContentRef.current)) {
        updateLineContents(lineContents, editor);
      }
      
      // Update last processed content
      lastProcessedContentRef.current = newContent;
    } catch (error) {
      console.error('Error processing content change:', error);
    } finally {
      setIsProcessingContent(false);
    }
  }, [quillRef, isInitialized, updateLineContents]);
  
  // Clear any pending content updates when unmounting
  useEffect(() => {
    return () => {
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, []);
  
  /**
   * Schedule a content update with debounce
   */
  const scheduleContentUpdate = useCallback((
    newContent: string | DeltaContent,
    delay: number = 300,
    options: ContentChangeOptions = {}
  ) => {
    if (contentUpdateTimeoutRef.current) {
      clearTimeout(contentUpdateTimeoutRef.current);
    }
    
    contentUpdateTimeoutRef.current = setTimeout(() => {
      processContentChange(newContent, options);
      contentUpdateTimeoutRef.current = null;
    }, delay);
  }, [processContentChange]);
  
  /**
   * Check if content changed significantly
   */
  const contentChangedSignificantly = (
    newContent: string | DeltaContent | null,
    previousContent: string | DeltaContent | null
  ): boolean => {
    if (!newContent || !previousContent) return true;
    
    const getContentText = (content: string | DeltaContent): string => {
      if (typeof content === 'string') return content;
      return isDeltaObject(content) ? extractPlainTextFromDelta(content) : '';
    };
    
    const newText = getContentText(newContent);
    const prevText = getContentText(previousContent);
    
    // Check if line count changed significantly
    const newLineCount = (newText.match(/\n/g) || []).length + 1;
    const prevLineCount = (prevText.match(/\n/g) || []).length + 1;
    
    if (Math.abs(newLineCount - prevLineCount) > 1) {
      return true;
    }
    
    // Check if text length changed significantly
    const lengthDiff = Math.abs(newText.length - prevText.length);
    return lengthDiff > 20;
  };
  
  return {
    processContentChange,
    scheduleContentUpdate,
    isProcessingContent
  };
};
