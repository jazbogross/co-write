
import { useEffect } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject } from '@/utils/editor';

export const useEditorLogger = (
  lineData: LineData[],
  content: any,
  lineCount: number,
  editorInitialized: boolean,
  quillRef: React.RefObject<ReactQuill>
) => {
  // Log lineData changes
  useEffect(() => {
    console.log(`📋 EditorLogger: lineData updated:`, lineData.length > 0 ? 
      `${lineData.length} lines` :
      `[]`);
    
    if (lineData.length > 0) {
      console.log('📋 EditorLogger: First line:', JSON.stringify(lineData[0]).substring(0, 100) + '...');
      if (lineData.length > 1) {
        console.log('📋 EditorLogger: Second line:', JSON.stringify(lineData[1]).substring(0, 100) + '...');
      }
      if (lineData.length > 2) {
        console.log('📋 EditorLogger: Last line:', JSON.stringify(lineData[lineData.length-1]).substring(0, 100) + '...');
      }
    }
  }, [lineData]);

  // Log content changes
  useEffect(() => {
    console.log('📋 EditorLogger: Content changed.');
    console.log('📋 EditorLogger: Content type:', typeof content, isDeltaObject(content) ? 'isDelta' : 'notDelta');
    if (typeof content === 'string') {
      console.log('📋 EditorLogger: Content preview:', content.substring(0, 100) + '...');
    } else if (content && typeof content === 'object') {
      console.log('📋 EditorLogger: Content structure:', JSON.stringify(content).substring(0, 100) + '...');
    }
  }, [content]);

  // Log line count changes
  useEffect(() => {
    console.log(`📋 EditorLogger: Updated line count: ${lineCount}`);
  }, [lineCount]);

  // Log editor initialization
  useEffect(() => {
    console.log(`📋 EditorLogger: Editor initialized: ${editorInitialized}`);
    if (editorInitialized) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        console.log(`📋 EditorLogger: Initial line count from editor: ${lines.length}`);
        
        console.log('📋 EditorLogger: Initializing line UUIDs in the DOM...');
        setTimeout(() => {
          const editorElement = document.querySelector('.ql-editor');
          if (editorElement) {
            const paragraphs = editorElement.querySelectorAll('p');
            console.log(`📋 EditorLogger: Found ${paragraphs.length} <p> elements`);
            
            Array.from(paragraphs).slice(0, 3).forEach((p, i) => {
              console.log(`📋 EditorLogger: Paragraph ${i+1} UUID:`, p.getAttribute('data-line-uuid'));
            });
          }
          console.log('📋 EditorLogger: Line UUIDs initialized.');
        }, 500);
      }
    }
  }, [editorInitialized, quillRef]);
};
