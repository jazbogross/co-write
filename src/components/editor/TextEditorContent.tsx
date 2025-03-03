
import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';
import { isDeltaObject } from '@/utils/editor';

interface TextEditorContentProps {
  content: string;
  lineCount: number;
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: string) => void;
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
  
  // Track editor mount state
  const isEditorMountedRef = useRef(false);
  const contentChangeRef = useRef(0);
  
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
  };
  
  // Only trigger onChange when content actually changes
  const handleContentChange = (newContent: string, delta: any, source: string) => {
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
  
  return (
    <div className="flex min-h-screen text-black">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto">          
          <div className="bg-editor-page p-8 min-h-a4-page flex ml-16">
            <LineNumbers count={lineCount} />
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={content}
                onChange={handleContentChange}
                modules={modules}
                formats={formats}
                theme="snow"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
