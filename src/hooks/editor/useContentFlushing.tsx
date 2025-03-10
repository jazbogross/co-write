
import { useCallback } from 'react';
import ReactQuill from 'react-quill';

export const useContentFlushing = (
  quillRef: React.RefObject<ReactQuill>,
  updateLineContents: (lines: any[], editor: any) => void
) => {
  console.log('💾 useContentFlushing: Hook initialized');
  
  // Capture all content from the editor, returns the captured content
  const captureEditorContent = useCallback(() => {
    console.log('💾 useContentFlushing: Capturing current editor content');
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.log('💾 useContentFlushing: No editor available for capturing content');
      return null;
    }
    
    // Get all lines from the editor
    const lines = editor.getLines(0);
    console.log(`💾 useContentFlushing: Capturing ${lines.length} lines from editor`);
    
    // Extract content and UUIDs for each line
    const capturedContent = lines.map((line: any, index: number) => {
      const lineIndex = editor.getIndex(line);
      const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
      
      // Get the Delta object for this line range
      const delta = editor.getContents(lineIndex, nextLineIndex - lineIndex);
      
      // Get UUID from DOM
      let uuid = null;
      if (line.domNode) {
        uuid = line.domNode.getAttribute('data-line-uuid');
        console.log(`💾 Captured line ${index+1} UUID from DOM: ${uuid || 'missing'}, delta ops: ${delta.ops.length}`);
      } else {
        console.log(`💾 Captured line ${index+1} has no domNode, delta ops: ${delta.ops.length}`);
      }
      
      return {
        content: delta,
        uuid,
        lineNumber: index + 1
      };
    });
    
    return {
      lines: capturedContent,
      editor
    };
  }, [quillRef]);
  
  const flushContentToLineData = useCallback(() => {
    console.log('💾 useContentFlushing: Flushing content to line data');
    
    // Use the capture function to get current content
    const captured = captureEditorContent();
    if (!captured) {
      return null;
    }
    
    const { lines: lineContents, editor } = captured;
    console.log(`💾 useContentFlushing: Flushing ${lineContents.length} lines to line data`);
    
    try {
      // Pass to updateLineContents to update the lineData state with the new content
      updateLineContents(lineContents.map(line => line.content), editor);
      console.log('💾 useContentFlushing: Updated line contents successfully');
      return captured;
    } catch (error) {
      console.error('💾 useContentFlushing: Error updating line contents:', error);
      return null;
    }
  }, [captureEditorContent, updateLineContents]);

  return { 
    flushContentToLineData,
    captureEditorContent
  };
};
