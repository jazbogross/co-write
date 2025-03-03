
import { useRef } from 'react';
import ReactQuill from 'react-quill';
import { isDeltaObject, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';
import { splitContentIntoLines } from '@/hooks/lineMatching/contentUtils';

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
        // Clear existing content first
        editor.deleteText(0, editor.getLength());
        
        if (isDeltaObject(newContent)) {
          // If it's a Delta object, use setContents directly
          const delta = safelyParseDelta(newContent);
          if (delta) {
            editor.setContents(delta);
            console.log('**** useContentUpdates.tsx **** Set editor contents from Delta object');
          } else {
            // Fallback to plain text if Delta parsing fails
            const textContent = extractPlainTextFromDelta(newContent);
            insertContentWithLineBreaks(editor, textContent);
          }
        } else {
          // For string content, split by newlines and insert properly
          const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
          insertContentWithLineBreaks(editor, contentStr);
        }
        
        // Update state
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
        insertContentWithLineBreaks(editor, textContent);
      } finally {
        isProcessingLinesRef.current = false;
      }
    }
  };
  
  // Helper function to properly insert content with line breaks
  const insertContentWithLineBreaks = (editor: any, content: string) => {
    if (!content) return;
    
    // Split content into lines
    const lines = splitContentIntoLines(content);
    
    // Create a delta with proper line breaks
    const ops = [];
    for (let i = 0; i < lines.length; i++) {
      ops.push({ insert: lines[i] });
      // Add line break after each line (except maybe the last one)
      if (i < lines.length - 1 || lines[i].endsWith('\n')) {
        ops.push({ insert: '\n' });
      }
    }
    
    // If the content doesn't end with a newline and there are lines, add one
    if (lines.length > 0 && !content.endsWith('\n')) {
      ops.push({ insert: '\n' });
    }
    
    // Apply the delta to the editor
    editor.setContents({ ops });
    console.log('**** useContentUpdates.tsx **** Inserted content with proper line breaks');
  };

  return {
    contentUpdateRef,
    handleChange,
    updateEditorContent
  };
};
