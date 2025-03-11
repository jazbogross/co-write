
import React from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';
import { isDeltaObject } from '@/utils/editor';

interface TextEditorMainProps {
  content: any;
  lineCount: number;
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: any) => void;
}

export const TextEditorMain: React.FC<TextEditorMainProps> = ({
  content,
  lineCount,
  quillRef,
  modules,
  formats,
  onChange,
}) => {
  const isEditorMountedRef = React.useRef(false);
  const contentChangeRef = React.useRef(0);

  React.useEffect(() => {
    if (!isEditorMountedRef.current) return;
    
    const logDomStructure = () => {
      const editor = quillRef.current?.getEditor();
      if (!editor) return;
      
      const quillLines = editor.getLines(0);
      const editorElement = document.querySelector('.ql-editor');
      
      if (editorElement) {
        const paragraphs = editorElement.querySelectorAll('p');
        
        if (lineCount !== paragraphs.length) {
          console.log(`⚠️ LINE COUNT MISMATCH - lineCount: ${lineCount}, DOM paragraphs: ${paragraphs.length}`);
        }
      }
    };
    
    logDomStructure();
  }, [lineCount, quillRef, isEditorMountedRef.current]);

  const handleEditorInit = () => {
    isEditorMountedRef.current = true;
    
    const editor = quillRef.current?.getEditor();
    if (editor && editor.lineTracking) {
      if (typeof editor.lineTracking.initialize === 'function') {
        editor.lineTracking.initialize();
      }
    }
  };

  const handleContentChange = (newContent: any, delta: any, source: string) => {
    contentChangeRef.current++;
    
    if (source === 'user') {
      onChange(newContent);
    }
  };

  React.useEffect(() => {
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
