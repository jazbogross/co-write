
import { useCallback } from 'react';
import ReactQuill from 'react-quill';

interface TextEditorOperationsProps {
  quillRef: React.RefObject<ReactQuill>;
  editorInitialized: boolean;
  handleChange: (content: string) => void;
  flushContentToLineData: () => void;
}

export const useEditorOperations = ({
  quillRef,
  editorInitialized,
  handleChange,
  flushContentToLineData
}: TextEditorOperationsProps) => {
  
  const handleContentChange = useCallback((newContent: string) => {
    console.log('🔧 EditorOperations: handleContentChange called');
    console.log('🔧 EditorOperations: Content preview:', newContent.substring(0, 100) + '...');
    
    handleChange(newContent);
    
    if (editorInitialized) {
      console.log('🔧 EditorOperations: Flushing content to line data');
      setTimeout(() => {
        console.log('🔧 EditorOperations: Running delayed flush content');
        flushContentToLineData();
        
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const lines = editor.getLines(0);
          console.log(`🔧 EditorOperations: Current line count: ${lines.length}`);
          
          const lineContents = lines.slice(0, 3).map(line => {
            const lineIndex = editor.getIndex(line);
            const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
            const delta = editor.getContents(lineIndex, nextLineIndex - lineIndex);
            return JSON.stringify(delta).substring(0, 50) + '...';
          });
          
          console.log(`🔧 EditorOperations: Current line contents sample:`, lineContents);
        }
      }, 50);
    }
  }, [editorInitialized, handleChange, flushContentToLineData, quillRef]);

  const formatText = useCallback((format: string, value: any) => {
    console.log(`🔧 EditorOperations: Formatting text with ${format}:`, value);
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    editor.format(format, value);
  }, [quillRef]);

  const handleSave = useCallback(() => {
    console.log('🔧 EditorOperations: handleSave called');
    flushContentToLineData();
    console.log('🔧 EditorOperations: Content flushed, ready for save');
  }, [flushContentToLineData]);

  return {
    handleContentChange,
    formatText,
    handleSave
  };
};
