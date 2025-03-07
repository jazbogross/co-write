
import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';
import { isDeltaObject, safelyParseDelta } from '@/utils/editor';
import { isStringifiedDelta, parseStringifiedDeltaIfPossible } from '@/utils/lineProcessing/mappingUtils';

interface TextEditorContentProps {
  content: any; // Changed from string to any to support Delta objects
  lineCount: number;
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: any) => void; // Changed from string to any
}

export const TextEditorContent: React.FC<TextEditorContentProps> = ({
  content,
  lineCount,
  quillRef,
  modules,
  formats,
  onChange,
}) => {
  console.log('📝 TextEditorContent rendering');
  console.log('📝 Content type:', typeof content, isDeltaObject(content) ? 'isDelta' : 'notDelta');
  console.log('📝 Line count:', lineCount);
  console.log('📝 Content length:', typeof content === 'string' ? content.length : 'N/A (Delta)');
  
  // Track editor mount state
  const isEditorMountedRef = useRef(false);
  const contentChangeRef = useRef(0);
  const initialContentSetRef = useRef(false);
  
  // Process content to ensure it's properly parsed if it's a stringified Delta
  const processedContent = (() => {
    if (!content) return '';
    
    if (isStringifiedDelta(content)) {
      return parseStringifiedDeltaIfPossible(content);
    }
    
    return content;
  })();
  
  // Handle editor initialization
  const handleEditorInit = () => {
    console.log('📝 TextEditorContent: Editor mounted');
    isEditorMountedRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    
    if (editor.lineTracking) {
      console.log('📝 TextEditorContent: Initializing line tracking');
      // Call LineTracker's initialize method if it exists
      if (typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
    }
    
    // If content is a Delta object or a stringified Delta, set it properly
    if (isDeltaObject(processedContent)) {
      console.log('📝 TextEditorContent: Setting Delta content directly on editor after mount');
      initialContentSetRef.current = true;
      // Cast to any to bypass type checking - we've already verified the Delta structure
      editor.setContents(processedContent as any);
    } else if (typeof processedContent === 'object' && 'ops' in processedContent) {
      console.log('📝 TextEditorContent: Setting parsed object with ops directly on editor after mount');
      initialContentSetRef.current = true;
      editor.setContents(processedContent as any);
    }
  };
  
  // Only trigger onChange when content actually changes
  const handleContentChange = (newContent: any, delta: any, source: string) => {
    contentChangeRef.current++;
    const changeId = contentChangeRef.current;
    
    console.log(`📝 ReactQuill onChange - source: ${source}, delta ops: ${delta.ops.length}, changeId: ${changeId}`);
    
    // Skip programmatic changes to prevent feedback loops
    if (source === 'user') {
      onChange(newContent);
    } else {
      console.log(`📝 Skipping non-user content change, source: ${source}`);
    }
  };
  
  // Handle component mount effect
  useEffect(() => {
    if (quillRef.current && !isEditorMountedRef.current) {
      handleEditorInit();
    }
  }, [quillRef.current]);
  
  // When processed content changes and editor is already mounted, update content
  useEffect(() => {
    if (isEditorMountedRef.current && !initialContentSetRef.current) {
      const editor = quillRef.current?.getEditor();
      if (editor && processedContent) {
        console.log('📝 TextEditorContent: Content changed, updating editor');
        
        if (isDeltaObject(processedContent)) {
          console.log('📝 TextEditorContent: Setting Delta content on update');
          initialContentSetRef.current = true;
          editor.setContents(processedContent as any);
        } else if (typeof processedContent === 'object' && 'ops' in processedContent) {
          console.log('📝 TextEditorContent: Setting object with ops on update');
          initialContentSetRef.current = true;
          editor.setContents(processedContent as any);
        } else if (typeof processedContent === 'string') {
          console.log('📝 TextEditorContent: Setting text content on update');
          initialContentSetRef.current = true;
          editor.setText(processedContent);
        }
      }
    }
  }, [processedContent, isEditorMountedRef.current, quillRef.current]);
  
  // Apply line UUIDs from lineData whenever lineCount changes
  useEffect(() => {
    if (!isEditorMountedRef.current) return;
    
    const editor = quillRef.current?.getEditor();
    if (editor && editor.lineTracking) {
      if (typeof editor.lineTracking.refreshLineUuids === 'function') {
        // Give the editor a moment to update its DOM before refreshing UUIDs
        setTimeout(() => {
          // Fetch the lineData array from the editor or state
          const domUuids = editor.lineTracking.getDomUuidMap();
          console.log(`📝 TextEditorContent: After content update, found ${domUuids.size} UUIDs in DOM`);
        }, 100);
      }
    }
  }, [lineCount]);

  // Log if content changes
  useEffect(() => {
    console.log(`📝 TextEditorContent: Content updated, type:`, typeof processedContent);
    if (typeof processedContent === 'string' && processedContent.length > 0) {
      console.log(`📝 Content preview:`, processedContent.substring(0, 50) + '...');
    } else if (isDeltaObject(processedContent)) {
      console.log(`📝 Content preview (Delta):`, JSON.stringify(processedContent).substring(0, 50) + '...');
    }
  }, [processedContent]);
  
  return (
    <div className="flex min-h-screen text-black">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto">          
          <div className="bg-editor-page p-8 min-h-a4-page flex ml-16">
            <LineNumbers count={lineCount} />
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={processedContent}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                theme="snow"
                placeholder="Start typing or loading content..."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
