
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import ReactQuill from 'react-quill';

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
  const [userId, setUserId] = useState<string | null>(null);
  const [isContentInitialized, setIsContentInitialized] = useState(false);
  const [editorInitialized, setEditorInitialized] = useState(false);
  const [lineCount, setLineCount] = useState(1);

  // Fetch user on component mount
  useEffect(() => {
    console.log('**** useTextEditor.tsx **** Fetching user...');
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('**** useTextEditor.tsx **** User fetched:', user.id);
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Set initial content when lineData is ready
  useEffect(() => {
    if (lineData.length > 0 && !isContentInitialized) {
      console.log('**** useTextEditor.tsx **** Setting initial content');
      setContent(originalContent);
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
  }, [lineData, isContentInitialized, originalContent, quillRef]);

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

  return {
    content,
    setContent,
    userId,
    lineCount,
    editorInitialized,
    handleChange
  };
};
