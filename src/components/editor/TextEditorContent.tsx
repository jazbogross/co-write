
import React from 'react';
import ReactQuill from 'react-quill';

interface TextEditorContentProps {
  content: any; 
  quillRef: React.RefObject<ReactQuill>;
  modules: any;
  formats: string[];
  onChange: (value: any) => void;
}

export const TextEditorContent: React.FC<TextEditorContentProps> = ({
  content,
  quillRef,
  modules,
  formats,
  onChange,
}) => {
  return (
    <div className="flex min-h-screen text-black">
      <div className="flex-1 overflow-auto">
        <div className="mx-auto">          
          <div className="bg-editor-page p-8 min-h-a4-page flex">
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
