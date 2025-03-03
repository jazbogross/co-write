
import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, extractPlainTextFromDelta, reconstructContent } from '@/utils/editor';

export const useContentInitialization = (
  originalContent: string,
  lineData: LineData[],
  quillRef: React.RefObject<ReactQuill>
) => {
  const [content, setContent] = useState(originalContent);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const isProcessingLinesRef = useRef(false);

  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized && !isProcessingLinesRef.current) {
      console.log('**** useContentInitialization.tsx **** Setting initial content');
      isProcessingLinesRef.current = true;
      
      try {
        // Instead of joining plain text, use reconstruction that preserves Delta formatting
        const reconstructedContent = reconstructContent(lineData);
        console.log('**** useContentInitialization.tsx **** Reconstructed content with preserved formatting');
        
        // Set the reconstructed content (could be a Delta object or string)
        setContent(reconstructedContent);
        setIsContentInitialized(true);
        
        // Turn on programmatic update mode if editor is initialized
        const editor = quillRef.current?.getEditor();
        if (editor && editor.lineTracking) {
          editor.lineTracking.setProgrammaticUpdate(true);
        }
        
        if (editor) {
          const lines = editor.getLines(0);
          console.log('**** useContentInitialization.tsx **** Initial line count from editor:', lines.length);
          setLineCount(lines.length || lineData.length);
        } else {
          setLineCount(lineData.length);
        }
        
        // Turn off programmatic update mode
        if (editor && editor.lineTracking) {
          editor.lineTracking.setProgrammaticUpdate(false);
        }
      } finally {
        isProcessingLinesRef.current = false;
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
