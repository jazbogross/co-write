
import { useRef } from 'react';
import ReactQuill from 'react-quill';
import { isDeltaObject, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';
import { splitContentIntoLines } from '@/hooks/lineMatching/contentUtils';

export const useContentUpdates = (
  content: string | any,
  setContent: (value: string | any) => void,
  lineCount: number,
  setLineCount: (count: number) => void,
  editorInitialized: boolean,
  isProcessingLinesRef: React.MutableRefObject<boolean>,
  quillRef: React.RefObject<ReactQuill>
) => {
  console.log('📝 useContentUpdates: Hook called with', {
    contentType: typeof content,
    isDelta: isDeltaObject(content),
    lineCount,
    editorInitialized
  });
  
  const contentUpdateRef = useRef(false);

  const handleChange = (newContent: string | any) => {
    console.log('📝 useContentUpdates: handleChange called with', {
      contentType: typeof newContent,
      isDelta: isDeltaObject(newContent),
      preview: typeof newContent === 'string' 
        ? newContent.substring(0, 50) + '...' 
        : JSON.stringify(newContent).substring(0, 50) + '...'
    });
    
    if (!editorInitialized) {
      console.log('📝 useContentUpdates: Ignoring content change before editor initialization');
      return;
    }
    
    if (isProcessingLinesRef.current) {
      console.log('📝 useContentUpdates: Skipping update during line processing');
      return;
    }
    
    console.log('📝 useContentUpdates: Processing content change');
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.log('📝 useContentUpdates: No editor available, skipping update');
      return;
    }

    // Get the actual Delta content from the editor to preserve formatting
    const editorDelta = editor.getContents();
    console.log('📝 useContentUpdates: Editor delta ops:', editorDelta.ops.length);
    
    setContent(editorDelta);
    console.log('📝 useContentUpdates: Content state updated with delta');
    
    const lines = editor.getLines(0);
    console.log(`📝 useContentUpdates: Line count from editor: ${lines.length}`);
    setLineCount(lines.length);
    
    // Log line UUIDs from DOM
    if (lines.length > 0) {
      lines.slice(0, 3).forEach((line: any, i: number) => {
        if (line.domNode) {
          const uuid = line.domNode.getAttribute('data-line-uuid');
          console.log(`📝 Line ${i+1} UUID from DOM: ${uuid || 'missing'}`);
        }
      });
    }
    
    return { 
      editor,
      lines
    };
  };

  const updateEditorContent = (newContent: string | any, forceUpdate: boolean = false) => {
    console.log('📝 useContentUpdates: updateEditorContent called with', {
      contentType: typeof newContent,
      isDelta: isDeltaObject(newContent),
      forceUpdate
    });
    
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.log('📝 useContentUpdates: No editor available, skipping update');
      return;
    }
    
    console.log('📝 useContentUpdates: Updating editor content programmatically');
    
    try {
      // Set the line tracker to programmatic update mode
      if (editor.lineTracking) {
        console.log('📝 useContentUpdates: Setting programmatic update mode ON');
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Clear existing content first
      const currentLength = editor.getLength();
      console.log(`📝 useContentUpdates: Clearing existing content (length: ${currentLength})`);
      editor.deleteText(0, currentLength);
      
      if (isDeltaObject(newContent)) {
        // If it's a Delta object, use setContents directly
        const delta = safelyParseDelta(newContent);
        if (delta) {
          console.log('📝 useContentUpdates: Setting editor contents with delta object, ops:', delta.ops.length);
          editor.setContents(delta);
          
          // Update content state
          setContent(delta);
          console.log('📝 useContentUpdates: Content state updated with delta');
        } else {
          // Fallback to plain text if Delta parsing fails
          console.log('📝 useContentUpdates: Delta parsing failed, falling back to plain text');
          const textContent = extractPlainTextFromDelta(newContent);
          insertContentWithLineBreaks(editor, textContent);
          
          // Update content state with text
          setContent(textContent);
          console.log('📝 useContentUpdates: Content state updated with text');
        }
      } else {
        // For string content, split by newlines and insert properly
        console.log('📝 useContentUpdates: Handling string content');
        const contentStr = typeof newContent === 'string' ? newContent : String(newContent);
        insertContentWithLineBreaks(editor, contentStr);
        
        // Update content state with text
        setContent(contentStr);
        console.log('📝 useContentUpdates: Content state updated with text');
      }
      
      // Update line count
      const updatedLines = editor.getLines(0);
      setLineCount(updatedLines.length);
      console.log(`📝 useContentUpdates: Updated line count: ${updatedLines.length}`);
      
      // Log line UUIDs after update
      if (updatedLines.length > 0) {
        updatedLines.slice(0, 3).forEach((line: any, i: number) => {
          if (line.domNode) {
            const uuid = line.domNode.getAttribute('data-line-uuid');
            console.log(`📝 After update - Line ${i+1} UUID from DOM: ${uuid || 'missing'}`);
          }
        });
      }
      
      // Turn off programmatic update mode
      if (editor.lineTracking) {
        console.log('📝 useContentUpdates: Setting programmatic update mode OFF');
        editor.lineTracking.setProgrammaticUpdate(false);
      }
    } catch (error) {
      console.error('📝 useContentUpdates: Error updating editor content:', error);
      
      // Turn off programmatic update mode even if there's an error
      if (editor.lineTracking) {
        console.log('📝 useContentUpdates: Setting programmatic update mode OFF (after error)');
        editor.lineTracking.setProgrammaticUpdate(false);
      }
      
      const textContent = typeof newContent === 'string' 
        ? newContent 
        : extractPlainTextFromDelta(newContent) || JSON.stringify(newContent);
      console.log('📝 useContentUpdates: Falling back to plain text insertion after error');
      insertContentWithLineBreaks(editor, textContent);
    } finally {
      isProcessingLinesRef.current = false;
    }
  };
  
  // Helper function to properly insert content with line breaks
  const insertContentWithLineBreaks = (editor: any, content: string) => {
    console.log('📝 useContentUpdates: insertContentWithLineBreaks called with content length:', content.length);
    
    if (!content) {
      console.log('📝 useContentUpdates: Empty content, nothing to insert');
      return;
    }
    
    // Split content into lines
    const lines = splitContentIntoLines(content);
    console.log(`📝 useContentUpdates: Split content into ${lines.length} lines`);
    
    // Create a delta with proper line breaks
    const ops = [];
    for (let i = 0; i < lines.length; i++) {
      ops.push({ insert: lines[i] });
      // Add line break after each line (except maybe the last one)
      if (i < lines.length - 1 || lines[i].endsWith('\n')) {
        ops.push({ insert: '\n' });
      }
    }
    
    // If the content doesn't end with a newline and there are lines, add one
    if (lines.length > 0 && !content.endsWith('\n')) {
      ops.push({ insert: '\n' });
    }
    
    // Apply the delta to the editor
    console.log(`📝 useContentUpdates: Setting contents with ${ops.length} delta ops`);
    editor.setContents({ ops });
  };

  return {
    contentUpdateRef,
    handleChange,
    updateEditorContent
  };
};
