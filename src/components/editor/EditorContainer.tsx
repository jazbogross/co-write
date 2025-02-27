
import React from 'react';
import ReactQuill from 'react-quill';
import { LineNumbers } from './LineNumbers';

interface EditorContainerProps {
  content: string;
  lineCount: number;
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: string) => void;
}

export const EditorContainer: React.FC<EditorContainerProps> = ({
  content,
  lineCount,
  quillRef,
  modules,
  formats,
  onChange,
}) => {
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
