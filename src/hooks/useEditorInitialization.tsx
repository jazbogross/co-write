
import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';

export const useEditorInitialization = (
  quillRef: React.RefObject<ReactQuill>,
  lineData: LineData[],
  isDataReady: boolean,
  initializeEditor: (editor: any) => boolean
) => {
  const [editorInitialized, setEditorInitialized] = useState(false);

  useEffect(() => {
    if (quillRef.current && isDataReady && !editorInitialized) {
      const editor = quillRef.current.getEditor();
      if (editor) {
        console.log('**** useEditorInitialization.tsx **** LineData is ready, initializing editor...');
        const success = initializeEditor(editor);
        
        if (success) {
          console.log('**** useEditorInitialization.tsx **** Editor successfully initialized');
          setEditorInitialized(true);
          
          const lines = editor.getLines(0);
          
          if (lines.length > 0 && lines[0].domNode) {
            console.log('**** useEditorInitialization.tsx **** First line UUID:', 
              lines[0].domNode.getAttribute('data-line-uuid'));
          }
        } else {
          console.error('**** useEditorInitialization.tsx **** Failed to initialize editor');
        }
      }
    }
  }, [isDataReady, editorInitialized, initializeEditor, quillRef]);

  return { editorInitialized };
};
