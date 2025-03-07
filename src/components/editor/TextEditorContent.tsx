
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
  
  // Process content to ensure it's properly parsed if it's a stringified Delta
  const processedContent = isStringifiedDelta(content) 
    ? parseStringifiedDeltaIfPossible(content) 
    : content;
  
  // Log DOM structure periodically to check line number sync
  useEffect(() => {
    if (!isEditorMountedRef.current) return;
    
    const logDomStructure = () => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      
      const quillLines = editor.getLines(0);
      const editorElement = document.querySelector('.ql-editor');
      
      if (editorElement) {
        const paragraphs = editorElement.querySelectorAll('p');
        console.log(`📝 DOM check - Quill lines: ${quillLines.length}, DOM paragraphs: ${paragraphs.length}`);
        
        // Check if line numbers match DOM structure
        if (lineCount !== paragraphs.length) {
          console.log(`📝 ⚠️ LINE COUNT MISMATCH - lineCount: ${lineCount}, DOM paragraphs: ${paragraphs.length}`);
        }
        
        // Log first few paragraph UUIDs
        Array.from(paragraphs).slice(0, 3).forEach((p, i) => {
          const uuid = p.getAttribute('data-line-uuid');
          console.log(`📝 Paragraph ${i+1} UUID: ${uuid || 'missing'}`);
        });
      }
    };
    
    // Log immediately and then every 5 seconds (reduced frequency to prevent too many logs)
    logDomStructure();
    const interval = setInterval(logDomStructure, 5000);
    
    return () => clearInterval(interval);
  }, [lineCount, quillRef, isEditorMountedRef.current]);
  
  // Handle editor initialization
  const handleEditorInit = () => {
    console.log('📝 TextEditorContent: Editor mounted');
    isEditorMountedRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (editor && editor.lineTracking) {
      console.log('📝 TextEditorContent: Initializing line tracking');
      // Call LineTracker's initialize method if it exists
      if (typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
    }
    
    // If content is a Delta object or a stringified Delta, set it properly
    if (editor) {
      if (isDeltaObject(processedContent)) {
        console.log('📝 TextEditorContent: Setting Delta content directly on editor after mount');
        // Cast to any to bypass type checking - we've already verified the Delta structure
        editor.setContents(processedContent as any);
      } else if (isStringifiedDelta(processedContent)) {
        const parsedDelta = parseStringifiedDeltaIfPossible(processedContent);
        if (parsedDelta) {
          console.log('📝 TextEditorContent: Setting parsed Delta content directly on editor after mount');
          // Cast to any to bypass type checking
          editor.setContents(parsedDelta as any);
        }
      }
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
  }, [quillRef]);
  
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
    console.log(`📝 TextEditorContent: Content updated, length:`, 
      typeof processedContent === 'string' ? processedContent.length : 'N/A (Delta object)');
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
