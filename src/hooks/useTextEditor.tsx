import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/hooks/useLineData';
import ReactQuill from 'react-quill';
import { extractPlainTextFromDelta, isDeltaObject, safelyParseDelta } from '@/utils/editor';

export const useTextEditor = (
  originalContent: string, 
  scriptId: string,
  quillRef: React.RefObject<ReactQuill>,
  lineData: LineData[],
  isDataReady: boolean,
  initializeEditor: (editor: any) => boolean,
  updateLineContents: (lines: any[], editor: any) => void
) => {
  const [content, setContent] = useState(originalContent);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const contentUpdateRef = useRef(false);
  const isProcessingLinesRef = useRef(false);

  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized && !isProcessingLinesRef.current) {
      console.log('**** useTextEditor.tsx **** Setting initial content');
      isProcessingLinesRef.current = true;
      
      try {
        const combinedContent = lineData.map(line => {
          if (isDeltaObject(line.content)) {
            const plainText = extractPlainTextFromDelta(line.content);
            console.log(`**** useTextEditor.tsx **** Extracted plain text from Delta for line ${line.lineNumber}`);
            return plainText;
          }
          return typeof line.content === 'string' ? line.content : String(line.content);
        }).join('\n');
        
        if (combinedContent && combinedContent !== content) {
          console.log('**** useTextEditor.tsx **** Initial content set from lineData');
          setContent(combinedContent);
        }
        
        setIsContentInitialized(true);
        
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const lines = editor.getLines(0);
          console.log('**** useTextEditor.tsx **** Initial line count from editor:', lines.length);
          setLineCount(lines.length || lineData.length);
        } else {
          setLineCount(lineData.length);
        }
      } finally {
        isProcessingLinesRef.current = false;
      }
    }
  }, [lineData, isContentInitialized, content, quillRef]);

  useEffect(() => {
    if (quillRef.current && isDataReady && !editorInitialized) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        console.log('**** useTextEditor.tsx **** LineData is ready, initializing editor...');
        const success = initializeEditor(editor);
        
        if (success) {
          console.log('**** useTextEditor.tsx **** Editor successfully initialized');
          setEditorInitialized(true);
          
          const lines = editor.getLines(0);
          setLineCount(lines.length);
          
          if (lines.length > 0 && lines[0].domNode) {
            console.log('**** useTextEditor.tsx **** First line UUID:', 
              lines[0].domNode.getAttribute('data-line-uuid'));
          }
        } else {
          console.error('**** useTextEditor.tsx **** Failed to initialize editor');
        }
      }
    }
  }, [isDataReady, editorInitialized, initializeEditor, quillRef]);

  const handleChange = (newContent: string) => {
    if (!editorInitialized) {
      console.log('**** useTextEditor.tsx **** Ignoring content change before editor initialization');
      return;
    }
    
    if (contentUpdateRef.current) {
      console.log('**** useTextEditor.tsx **** Skipping update during programmatic change');
      contentUpdateRef.current = false;
      return;
    }
    
    if (isProcessingLinesRef.current) {
      console.log('**** useTextEditor.tsx **** Skipping update during line processing');
      return;
    }
    
    console.log('**** useTextEditor.tsx **** Content changed.');
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    setContent(newContent);
    
    const lines = editor.getLines(0);
    setLineCount(lines.length);
    
    return { 
      editor,
      lines
    };
  };

  const updateEditorContent = (newContent: string | any) => {
    contentUpdateRef.current = true;
    isProcessingLinesRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (editor) {
      console.log('**** useTextEditor.tsx **** Updating editor content programmatically');
      
      try {
        editor.deleteText(0, editor.getLength());
        
        if (isDeltaObject(newContent)) {
          const delta = safelyParseDelta(newContent);
          if (delta) {
            editor.setContents(delta);
            console.log('**** useTextEditor.tsx **** Set editor contents from Delta object');
          } else {
            const textContent = typeof newContent === 'string' 
              ? newContent 
              : extractPlainTextFromDelta(newContent) || JSON.stringify(newContent);
            editor.insertText(0, textContent);
          }
        } else {
          const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
          const lines = contentStr.split('\n');
          
          lines.forEach((line, index) => {
            const position = editor.getLength() - 1;
            editor.insertText(position, line);
            
            if (index < lines.length - 1) {
              editor.insertText(editor.getLength() - 1, '\n');
            }
          });
          
          console.log('**** useTextEditor.tsx **** Inserted content line by line');
        }
        
        if (typeof newContent === 'string') {
          setContent(newContent);
        } else {
          setContent(extractPlainTextFromDelta(newContent) || '');
        }
        
        const lines = editor.getLines(0);
        setLineCount(lines.length);
      } catch (error) {
        console.error('**** useTextEditor.tsx **** Error updating editor content:', error);
        const textContent = typeof newContent === 'string' 
          ? newContent 
          : extractPlainTextFromDelta(newContent) || JSON.stringify(newContent);
        editor.insertText(0, textContent);
      } finally {
        isProcessingLinesRef.current = false;
      }
    }
  };

  return {
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent
  };
};
