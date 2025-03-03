
import { useRef } from 'react';
import ReactQuill from 'react-quill';
import { isDeltaObject, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';

export const useContentUpdates = (
  content: string,
  setContent: (value: string) => void,
  lineCount: number,
  setLineCount: (count: number) => void,
  editorInitialized: boolean,
  isProcessingLinesRef: React.MutableRefObject<boolean>,
  quillRef: React.RefObject<ReactQuill>
) => {
  const contentUpdateRef = useRef(false);

  const handleChange = (newContent: string) => {
    if (!editorInitialized) {
      console.log('**** useContentUpdates.tsx **** Ignoring content change before editor initialization');
      return;
    }
    
    if (contentUpdateRef.current) {
      console.log('**** useContentUpdates.tsx **** Skipping update during programmatic change');
      contentUpdateRef.current = false;
      return;
    }
    
    if (isProcessingLinesRef.current) {
      console.log('**** useContentUpdates.tsx **** Skipping update during line processing');
      return;
    }
    
    console.log('**** useContentUpdates.tsx **** Content changed.');
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
      console.log('**** useContentUpdates.tsx **** Updating editor content programmatically');
      
      try {
        editor.deleteText(0, editor.getLength());
        
        if (isDeltaObject(newContent)) {
          const delta = safelyParseDelta(newContent);
          if (delta) {
            editor.setContents(delta);
            console.log('**** useContentUpdates.tsx **** Set editor contents from Delta object');
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
          
          console.log('**** useContentUpdates.tsx **** Inserted content line by line');
        }
        
        if (typeof newContent === 'string') {
          setContent(newContent);
        } else {
          setContent(extractPlainTextFromDelta(newContent) || '');
        }
        
        const lines = editor.getLines(0);
        setLineCount(lines.length);
      } catch (error) {
        console.error('**** useContentUpdates.tsx **** Error updating editor content:', error);
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
    contentUpdateRef,
    handleChange,
    updateEditorContent
  };
};
