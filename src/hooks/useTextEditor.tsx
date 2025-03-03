
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/hooks/useLineData';
import ReactQuill from 'react-quill';
import { extractPlainTextFromDelta, isDeltaObject, safelyParseDelta } from '@/utils/editorUtils';

export const useTextEditor = (
  originalContent: string, 
  scriptId: string,
  quillRef: React.RefObject<ReactQuill>,
  lineData: LineData[],
  isDataReady: boolean,
  initializeEditor: (editor: any) => boolean,
  updateLineContents: (lines: string[], editor: any) => void
) => {
  const [content, setContent] = useState(originalContent);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const contentUpdateRef = useRef(false);

  // Set initial content when lineData is ready
  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized) {
      console.log('**** useTextEditor.tsx **** Setting initial content');
      
      // Combine line data content, ensuring we extract plain text from any Delta objects
      const combinedContent = lineData.map(line => {
        // If the content is a Delta object, extract the plain text
        if (isDeltaObject(line.content)) {
          const plainText = extractPlainTextFromDelta(line.content);
          console.log(`**** useTextEditor.tsx **** Extracted plain text from Delta for line ${line.lineNumber}`);
          return plainText;
        }
        return line.content;
      }).join('\n');
      
      // Only update if we have a valid string that's different
      if (combinedContent && combinedContent !== content) {
        console.log('**** useTextEditor.tsx **** Initial content set from lineData');
        setContent(combinedContent);
      }
      
      setIsContentInitialized(true);
      
      // Update line count based on what's in the editor
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        console.log('**** useTextEditor.tsx **** Initial line count from editor:', lines.length);
        setLineCount(lines.length || lineData.length);
      } else {
        setLineCount(lineData.length);
      }
    }
  }, [lineData, isContentInitialized, content, quillRef]);

  // Initialize editor when lineData is ready
  useEffect(() => {
    if (quillRef.current && isDataReady && !editorInitialized) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        console.log('**** useTextEditor.tsx **** LineData is ready, initializing editor...');
        const success = initializeEditor(editor);
        
        if (success) {
          console.log('**** useTextEditor.tsx **** Editor successfully initialized');
          setEditorInitialized(true);
          
          // Count lines again to make sure we're in sync
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

  // Handle content changes in the editor
  const handleChange = (newContent: string) => {
    // Only allow changes once editor is properly initialized
    if (!editorInitialized) {
      console.log('**** useTextEditor.tsx **** Ignoring content change before editor initialization');
      return;
    }
    
    // Prevent re-processing the same content to avoid loops
    if (contentUpdateRef.current) {
      console.log('**** useTextEditor.tsx **** Skipping update during programmatic change');
      contentUpdateRef.current = false;
      return;
    }
    
    console.log('**** useTextEditor.tsx **** Content changed.');
    const editor = quillRef.current?.getEditor();
    if (!editor) return;

    // Update the content
    setContent(newContent);
    
    // Update line count
    const lines = editor.getLines(0);
    setLineCount(lines.length);
    
    return { 
      editor,
      lines
    };
  };

  // Set content directly from external sources (like when drafts are loaded)
  const updateEditorContent = (newContent: string) => {
    // Mark this as a programmatic update to avoid infinite loops
    contentUpdateRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (editor) {
      console.log('**** useTextEditor.tsx **** Updating editor content programmatically');
      
      // Clear the editor first
      editor.deleteText(0, editor.getLength());
      
      try {
        // Check if the content is a Delta object
        if (isDeltaObject(newContent)) {
          // If it's a Delta, parse it and set it directly
          const delta = safelyParseDelta(newContent);
          if (delta) {
            editor.setContents(delta);
            console.log('**** useTextEditor.tsx **** Set editor contents from Delta object');
          } else {
            // If Delta parsing failed, insert as text
            editor.insertText(0, newContent);
          }
        } else {
          // Insert the new content as plain text
          editor.insertText(0, newContent);
        }
      } catch (error) {
        console.error('**** useTextEditor.tsx **** Error updating editor content:', error);
        // Fallback to plain text insertion
        editor.insertText(0, newContent);
      }
      
      // Update React state to stay in sync
      setContent(newContent);
      
      // Update line count
      const lines = editor.getLines(0);
      setLineCount(lines.length);
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
