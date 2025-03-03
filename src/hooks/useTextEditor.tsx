
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/hooks/useLineData';
import ReactQuill from 'react-quill';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editorUtils';

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
      
      // Combine line data content instead of using originalContent directly
      const combinedContent = lineData.map(line => line.content).join('\n');
      
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
      // Clear the editor first
      editor.deleteText(0, editor.getLength());
      
      // Insert the new content
      editor.insertText(0, newContent);
      console.log('**** useTextEditor.tsx **** Editor content updated programmatically');
      
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
