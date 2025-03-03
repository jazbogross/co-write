
import { useCallback } from 'react';
import ReactQuill from 'react-quill';

export const useContentFlushing = (
  quillRef: React.RefObject<ReactQuill>,
  updateLineContents: (lines: any[], editor: any) => void
) => {
  console.log('💾 useContentFlushing: Hook initialized');
  
  const flushContentToLineData = useCallback(() => {
    console.log('💾 useContentFlushing: Flushing content to line data');
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.log('💾 useContentFlushing: No editor available for flushing content');
      return;
    }
    
    // Get all lines from the editor
    const lines = editor.getLines(0);
    console.log(`💾 useContentFlushing: Flushing ${lines.length} lines to line data`);
    
    // Extract content for each line
    const lineContents = lines.map((line: any, index: number) => {
      const lineIndex = editor.getIndex(line);
      const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
      
      // Get the Delta object for this line range
      const delta = editor.getContents(lineIndex, nextLineIndex - lineIndex);
      
      // Log line DOM properties
      if (line.domNode) {
        const uuid = line.domNode.getAttribute('data-line-uuid');
        console.log(`💾 Line ${index+1} UUID from DOM: ${uuid || 'missing'}, delta ops: ${delta.ops.length}`);
      } else {
        console.log(`💾 Line ${index+1} has no domNode, delta ops: ${delta.ops.length}`);
      }
      
      return delta;
    });
    
    console.log(`💾 useContentFlushing: Extracted ${lineContents.length} line contents`);
    
    try {
      // Pass to updateLineContents to update the lineData state with the new content
      updateLineContents(lineContents, editor);
      console.log('💾 useContentFlushing: Updated line contents successfully');
    } catch (error) {
      console.error('💾 useContentFlushing: Error updating line contents:', error);
    }
  }, [quillRef, updateLineContents]);

  return { flushContentToLineData };
};
