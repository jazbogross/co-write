
import React from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from '@/utils/editor/quill-types';
import { modules, formats } from './EditorConfig';

interface EditorContentProps {
  editorContent: DeltaStatic | null;
  quillRef: React.RefObject<ReactQuill>;
  handleChange: (value: string, delta: DeltaStatic, source: string, editor: any) => void;
  handleChangeSelection: (range: any, source: string, editor: any) => void;
  handleEditorClick: (event: React.MouseEvent) => void;
}

export const EditorContent: React.FC<EditorContentProps> = ({
  editorContent,
  quillRef,
  handleChange,
  handleChangeSelection,
  handleEditorClick
}) => {
  return (
    <div onClick={handleEditorClick}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorContent || { ops: [{ insert: '\n' }] } as DeltaStatic}
        onChange={handleChange}
        onChangeSelection={handleChangeSelection}
        modules={modules}
        formats={formats}
      />
    </div>
  );
};

// Use React.memo to prevent unnecessary re-renders
export default React.memo(EditorContent);
