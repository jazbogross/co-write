
import React from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic, Sources } from '@/utils/editor/quill-types';
import { UnprivilegedEditor } from 'react-quill';

interface EditorContentProps {
  editorContent: DeltaStatic | null;
  quillRef: React.RefObject<ReactQuill>;
  handleChange: (value: string, delta: DeltaStatic, source: Sources, editor: UnprivilegedEditor) => void;
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
        value={editorContent || { ops: [{ insert: '\n' }] } as unknown as DeltaStatic}
        onChange={(value, delta, source, editor) => {
          handleChange(value, delta as unknown as DeltaStatic, source as Sources, editor);
        }}
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
