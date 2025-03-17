
import React from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';

interface TextEditorContentProps {
  content: any; 
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: any) => void;
  lineCount?: number; // Add line count prop
}

export const TextEditorContent: React.FC<TextEditorContentProps> = ({
  content,
  quillRef,
  modules,
  formats,
  onChange,
  lineCount = 0, // Default to 0 if not provided
}) => {
  return (
    <div className="flex min-h-screen text-black">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto">          
          <div className="bg-editor-page p-8 min-h-a4-page flex">
            <LineNumbers count={lineCount} />
            <div className="flex-1">
              <ReactQuill
                ref={quillRef}
                value={content}
                onChange={onChange}
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
