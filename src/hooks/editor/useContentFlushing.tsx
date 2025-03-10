
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
    console.log(`💾 useContentFlushing: Found ${lines.length} lines in the editor`);
    console.log('💾 Full editor content:', editor.getContents());
    
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
        console.log(`💾 Line ${index+1}: UUID from DOM: ${uuid || 'missing'}, Delta:`, JSON.stringify(delta));
      } else {
        console.log(`💾 Line ${index+1} has no domNode, Delta:`, JSON.stringify(delta));
      }
      
      return {
        content: delta,
        uuid,
        lineNumber: index + 1
      };
    });
    
    console.log('💾 useContentFlushing: Extracted line contents:', capturedContent);
    
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
    console.log(`💾 useContentFlushing: About to call updateLineContents with extracted lines`);
    
    try {
      // Pass to updateLineContents to update the lineData state with the new content
      // This should include ALL lines from the editor
      updateLineContents(lineContents.map(line => line.content), editor);
      console.log('💾 useContentFlushing: updateLineContents callback executed successfully');
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
