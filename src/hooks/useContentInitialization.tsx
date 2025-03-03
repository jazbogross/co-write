
import { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

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
        const combinedContent = lineData.map(line => {
          if (isDeltaObject(line.content)) {
            const plainText = extractPlainTextFromDelta(line.content);
            console.log(`**** useContentInitialization.tsx **** Extracted plain text from Delta for line ${line.lineNumber}`);
            return plainText;
          }
          return typeof line.content === 'string' ? line.content : String(line.content);
        }).join('\n');
        
        if (combinedContent && combinedContent !== content) {
          console.log('**** useContentInitialization.tsx **** Initial content set from lineData');
          setContent(combinedContent);
        }
        
        setIsContentInitialized(true);
        
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const lines = editor.getLines(0);
          console.log('**** useContentInitialization.tsx **** Initial line count from editor:', lines.length);
          setLineCount(lines.length || lineData.length);
        } else {
          setLineCount(lineData.length);
        }
      } finally {
        isProcessingLinesRef.current = false;
      }
    }
  }, [lineData, isContentInitialized, content, quillRef]);

  return {
    content,
    setContent,
    lineCount,
    setLineCount,
    isContentInitialized,
    isProcessingLinesRef
  };
};
