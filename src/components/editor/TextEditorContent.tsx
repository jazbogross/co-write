
// Update the TextEditorContent.tsx to handle UUID refresh
// File: src/components/editor/TextEditorContent.tsx

import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';
import { isDeltaObject } from '@/utils/editor';

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
  // Track editor mount state
  const isEditorMountedRef = useRef(false);
  const contentChangeRef = useRef(0);
  
  // Log DOM structure only when line count changes
  useEffect(() => {
    if (!isEditorMountedRef.current) return;
    
    const logDomStructure = () => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      
      const quillLines = editor.getLines(0);
      const editorElement = document.querySelector('.ql-editor');
      
      if (editorElement) {
        const paragraphs = editorElement.querySelectorAll('p');
        
        // Check if line numbers match DOM structure
        if (lineCount !== paragraphs.length) {
          console.log(`⚠️ LINE COUNT MISMATCH - lineCount: ${lineCount}, DOM paragraphs: ${paragraphs.length}`);
        }
      }
    };
    
    // Log only when line count changes
    logDomStructure();
  }, [lineCount, quillRef, isEditorMountedRef.current]);
  
  // Handle editor initialization
  const handleEditorInit = () => {
    isEditorMountedRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (editor && editor.lineTracking) {
      // Call LineTracker's initialize method if it exists
      if (typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
    }
  };
  
  // Only trigger onChange when content actually changes
  const handleContentChange = (newContent: any, delta: any, source: string) => {
    contentChangeRef.current++;
    const changeId = contentChangeRef.current;
    
    // Skip programmatic changes to prevent feedback loops
    if (source === 'user') {
      onChange(newContent);
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
