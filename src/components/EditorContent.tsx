import React from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from '@/utils/editor/quill-types';

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
        modules={{
          toolbar: false,
          suggestionFormat: true
        }}
        formats={[
          'header',
          'bold',
          'italic',
          'underline',
          'strike',
          'blockquote',
          'list',
          'bullet',
          'indent',
          'link',
          'image',
          'code-block',
          'background',
          'color',
          'align',
          'direction',
          'suggestion-add',
          'suggestion-remove'
        ]}
      />
    </div>
  );
};

export default React.memo(EditorContent);
