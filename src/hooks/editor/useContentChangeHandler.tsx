
import { useCallback, useRef } from 'react';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

/**
 * Hook to handle content changes in the editor
 */
export const useContentChangeHandler = (
  editorInitialized: boolean,
  quillRef: React.RefObject<ReactQuill>,
  setContent: (content: string | DeltaContent) => void,
  isProcessingLinesRef: React.MutableRefObject<boolean>,
  isUpdatingEditorRef: React.MutableRefObject<boolean>
) => {
  const contentUpdateRef = useRef(false);
  const lastContentRef = useRef<string | null>(null);
  
  const handleChange = useCallback((newContent: string | DeltaContent, delta?: any, source?: string) => {
    // Skip processing if source is not 'user' (i.e., it's a programmatic change)
    if (source && source !== 'user') {
      console.log('📝 useContentChangeHandler: Skipping non-user change:', source);
      return;
    }
    
    let previewText: string;
    
    if (typeof newContent === 'string') {
      previewText = newContent.substring(0, 50) + '...';
    } else if (newContent) {
      previewText = JSON.stringify(newContent).substring(0, 50) + '...';
    } else {
      previewText = '[empty content]';
    }
      
    console.log('📝 useContentChangeHandler: handleChange called with', {
      contentType: typeof newContent,
      isDelta: isDeltaObject(newContent),
      preview: previewText,
      source
    });
    
    if (!editorInitialized) {
      console.log('📝 useContentChangeHandler: Ignoring content change before editor initialization');
      return;
    }
    
    if (isProcessingLinesRef.current || isUpdatingEditorRef.current) {
      console.log('📝 useContentChangeHandler: Skipping update during line processing or editor update');
      return;
    }
    
    // Compare with previous content to avoid unnecessary updates
    const contentString = typeof newContent === 'string' 
      ? newContent 
      : JSON.stringify(newContent);
      
    if (lastContentRef.current === contentString) {
      console.log('📝 useContentChangeHandler: Content unchanged, skipping update');
      return;
    }
    
    lastContentRef.current = contentString;
    
    console.log('📝 useContentChangeHandler: Processing content change');
    const editor = quillRef.current?.getEditor();
    if (!editor) {
      console.log('📝 useContentChangeHandler: No editor available, skipping update');
      return;
    }

    // Get the actual Delta content from the editor to preserve formatting
    const editorDelta = editor.getContents();
    console.log('📝 useContentChangeHandler: Editor delta ops:', editorDelta.ops.length);
    
    // Convert editor Delta to our DeltaContent type
    const convertedDelta: DeltaContent = {
      ops: editorDelta.ops.map(op => ({
        ...op,
        insert: op.insert || ''
      }))
    };
    
    setContent(convertedDelta);
    console.log('📝 useContentChangeHandler: Content state updated with delta');
    
    const lines = editor.getLines(0);
    console.log(`📝 useContentChangeHandler: Line count from editor: ${lines.length}`);
    
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
  }, [editorInitialized, quillRef, setContent, isProcessingLinesRef, isUpdatingEditorRef]);

  return {
    contentUpdateRef,
    handleChange
  };
};
