
import { useState, useEffect, useRef } from 'react';
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
    originalContentLength: originalContent.length,
    lineDataLength: lineData.length
  });
  
  const [content, setContent] = useState<string | DeltaContent>(originalContent);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const isProcessingLinesRef = useRef(false);

  useEffect(() => {
    console.log('🔄 useContentInitialization: Effect triggered with', {
      lineDataLength: lineData.length,
      isContentInitialized,
      isProcessing: isProcessingLinesRef.current
    });
    
    if (lineData.length > 0 && !isContentInitialized && !isProcessingLinesRef.current) {
      console.log('🔄 useContentInitialization: Setting initial content');
      isProcessingLinesRef.current = true;
      
      try {
        // Log line data content types
        lineData.slice(0, 3).forEach((line, i) => {
          const previewText = typeof line.content === 'string' 
            ? line.content.substring(0, 30) 
            : JSON.stringify(line.content).substring(0, 30) + '...';
            
          console.log(`🔄 Line ${i+1} content type:`, typeof line.content, 
            isDeltaObject(line.content) ? 'isDelta' : 'notDelta',
            'preview:', previewText
          );
        });
        
        // Instead of joining plain text, use reconstruction that preserves Delta formatting
        const reconstructedContent = reconstructContent(lineData);
        
        const previewText = typeof reconstructedContent === 'string' 
          ? reconstructedContent.substring(0, 100) + '...'
          : JSON.stringify(reconstructedContent).substring(0, 100) + '...';
          
        console.log('🔄 Reconstructed content type:', typeof reconstructedContent, 
          isDeltaObject(reconstructedContent) ? 'isDelta' : 'notDelta');
        console.log('🔄 Reconstructed content preview:', previewText);
        
        // Set the reconstructed content (could be a Delta object or string)
        setContent(reconstructedContent);
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
  }, [lineData, isContentInitialized, quillRef]);

  return {
    content,
    setContent,
    lineCount,
    setLineCount,
    isContentInitialized,
    isProcessingLinesRef
  };
};
