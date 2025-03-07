
import { useState, useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, extractPlainTextFromDelta, reconstructContent } from '@/utils/editor';
import { DeltaContent } from '@/utils/editor/types';

export const useContentInitialization = (
  originalContent: string,
  lineData: LineData[],
  quillRef: React.RefObject<ReactQuill>
) => {
  console.log('🔄 useContentInitialization: Hook called with', {
    originalContentLength: originalContent?.length || 0,
    lineDataLength: lineData.length
  });
  
  const [content, setContent] = useState<string | DeltaContent>(originalContent || '');
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const isProcessingLinesRef = useRef(false);
  const initAttemptedRef = useRef(false);

  // Memoize content update to prevent unnecessary re-renders
  const updateContent = useCallback((newContent: string | DeltaContent) => {
    console.log('🔄 useContentInitialization: updateContent called');
    let previewText: string;
      
    if (typeof newContent === 'string') {
      previewText = newContent.substring(0, 50) + '...';
    } else if (newContent) {
      previewText = JSON.stringify(newContent).substring(0, 50) + '...';
    } else {
      previewText = '[empty content]';
    }
    
    console.log('🔄 useContentInitialization: Setting content, type:', 
      typeof newContent, isDeltaObject(newContent) ? 'isDelta' : 'notDelta', 
      'preview:', previewText);
    
    setContent(newContent);
  }, []);

  useEffect(() => {
    // Only initialize content once when data becomes available
    if (lineData.length > 0 && !isContentInitialized && !isProcessingLinesRef.current && !initAttemptedRef.current) {
      console.log('🔄 useContentInitialization: Setting initial content, lineData length:', lineData.length);
      initAttemptedRef.current = true;
      isProcessingLinesRef.current = true;
      
      try {
        // Log line data content types
        lineData.slice(0, 3).forEach((line, i) => {
          let previewText: string;
          
          if (typeof line.content === 'string') {
            previewText = line.content.substring(0, 30);
          } else if (line.content && typeof line.content === 'object') {
            const contentStr = JSON.stringify(line.content);
            previewText = contentStr ? contentStr.substring(0, 30) + '...' : '[empty content]';
          } else {
            previewText = '[empty content]';
          }
            
          console.log(`🔄 Line ${i+1} content type:`, typeof line.content, 
            isDeltaObject(line.content) ? 'isDelta' : 'notDelta',
            'preview:', previewText
          );
        });
        
        // Reconstruct Delta content from line data
        const reconstructedContent = reconstructContent(lineData);
        
        let previewText: string;
        if (typeof reconstructedContent === 'string') {
          previewText = (reconstructedContent as string).substring(0, 100) + '...';
        } else if (reconstructedContent && typeof reconstructedContent === 'object') {
          const contentStr = JSON.stringify(reconstructedContent);
          previewText = contentStr ? contentStr.substring(0, 100) + '...' : '[empty content]';
        } else {
          previewText = '[empty content]';
        }
          
        console.log('🔄 Reconstructed content type:', typeof reconstructedContent, 
          isDeltaObject(reconstructedContent) ? 'isDelta' : 'notDelta');
        console.log('🔄 Reconstructed content preview:', previewText);
        
        // Update content - ensure it's a Delta object for proper formatting
        updateContent(reconstructedContent);
        setIsContentInitialized(true);
        console.log('🔄 Content initialized');
        
        // Turn on programmatic update mode if editor is initialized
        const editor = quillRef.current?.getEditor();
        if (editor && editor.lineTracking) {
          console.log('🔄 Setting programmatic update mode ON');
          editor.lineTracking.setProgrammaticUpdate(true);
        }
        
        if (editor) {
          const lines = editor.getLines(0);
          console.log('🔄 Initial line count from editor:', lines.length);
          setLineCount(lines.length || lineData.length);
        } else {
          console.log('🔄 No editor instance, using lineData length:', lineData.length);
          setLineCount(lineData.length);
        }
        
        // Turn off programmatic update mode
        if (editor && editor.lineTracking) {
          console.log('🔄 Setting programmatic update mode OFF');
          editor.lineTracking.setProgrammaticUpdate(false);
        }
      } catch (error) {
        console.error('🔄 Error during content initialization:', error);
      } finally {
        isProcessingLinesRef.current = false;
        console.log('🔄 Processing complete');
      }
    }
  }, [lineData, isContentInitialized, quillRef, updateContent, originalContent]);

  return {
    content,
    setContent: updateContent,
    lineCount,
    setLineCount,
    isContentInitialized,
    isProcessingLinesRef
  };
};
