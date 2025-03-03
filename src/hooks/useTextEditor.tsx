
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
  updateLineContents: (lines: any[], editor: any) => void
) => {
  const [content, setContent] = useState(originalContent);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);
  const contentUpdateRef = useRef(false);
  const isProcessingLinesRef = useRef(false);

  // Set initial content when lineData is ready
  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized && !isProcessingLinesRef.current) {
      console.log('**** useTextEditor.tsx **** Setting initial content');
      isProcessingLinesRef.current = true;
      
      try {
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
      } finally {
        isProcessingLinesRef.current = false;
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
    
    // Prevent processing during line operations
    if (isProcessingLinesRef.current) {
      console.log('**** useTextEditor.tsx **** Skipping update during line processing');
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
  const updateEditorContent = (newContent: string | any) => {
    // Mark this as a programmatic update to avoid infinite loops
    contentUpdateRef.current = true;
    isProcessingLinesRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (editor) {
      console.log('**** useTextEditor.tsx **** Updating editor content programmatically');
      
      try {
        // Clear the editor first
        editor.deleteText(0, editor.getLength());
        
        // Check if the content is a Delta object
        if (isDeltaObject(newContent)) {
          // If it's a Delta, parse it and set it directly
          const delta = safelyParseDelta(newContent);
          if (delta) {
            editor.setContents(delta);
            console.log('**** useTextEditor.tsx **** Set editor contents from Delta object');
          } else {
            // If Delta parsing failed, insert as text
            editor.insertText(0, typeof newContent === 'string' ? newContent : JSON.stringify(newContent));
          }
        } else {
          // If content has multiple lines, split and insert line by line to ensure proper structure
          const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
          const lines = contentStr.split('\n');
          
          lines.forEach((line, index) => {
            const position = editor.getLength() - 1;
            editor.insertText(position, line);
            
            // Add newline for all but the last line
            if (index < lines.length - 1) {
              editor.insertText(editor.getLength() - 1, '\n');
            }
          });
          
          console.log('**** useTextEditor.tsx **** Inserted content line by line');
        }
        
        // Update React state to stay in sync
        setContent(newContent);
        
        // Update line count
        const lines = editor.getLines(0);
        setLineCount(lines.length);
      } catch (error) {
        console.error('**** useTextEditor.tsx **** Error updating editor content:', error);
        // Fallback to plain text insertion
        if (typeof newContent === 'string') {
          editor.insertText(0, newContent);
        } else {
          editor.insertText(0, JSON.stringify(newContent));
        }
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
