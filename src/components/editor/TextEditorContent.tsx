
import React, { useEffect } from 'react';
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
  
  // Log DOM structure periodically to check line number sync
  useEffect(() => {
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
    
    // Log immediately and then every 2 seconds
    logDomStructure();
    const interval = setInterval(logDomStructure, 2000);
    
    return () => clearInterval(interval);
  }, [lineCount, quillRef]);
  
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
                onChange={(newContent, delta, source) => {
                  console.log(`📝 ReactQuill onChange - source: ${source}, delta ops: ${delta.ops.length}`);
                  onChange(newContent);
                }}
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
