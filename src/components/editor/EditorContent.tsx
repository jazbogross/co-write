
import React from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from 'quill';

interface EditorContentProps {
  content: DeltaStatic;
  quillRef: React.RefObject<ReactQuill>;
  handleChange: (value: any) => void;
}

export const EditorContent: React.FC<EditorContentProps> = ({ 
  content, 
  quillRef, 
  handleChange 
}) => {
  const modules = {
    toolbar: [
      ['bold', 'italic'],
      [{ 'direction': 'rtl' }],
      [{ 'align': ['', 'center', 'right'] }]
    ]
  };

  return (
    <ReactQuill 
      ref={quillRef}
      defaultValue={content}
      onChange={handleChange}
      theme="snow"
      modules={modules}
      className="bg-white h-[50vh] rounded-md"
    />
  );
};
