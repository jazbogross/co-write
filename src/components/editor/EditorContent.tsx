
import React from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from 'quill';

interface EditorContentProps {
  editorContent: DeltaStatic | null;
  quillRef: React.RefObject<ReactQuill>;
  handleChange: (value: string, delta: DeltaStatic, source: string, editor: any) => void;
  handleChangeSelection: (range: any, source: string, editor: any) => void;
  handleEditorClick: (event: React.MouseEvent) => void;
  handleMouseMove?: (event: React.MouseEvent) => void;
  handleMouseLeave?: () => void;
  readOnly?: boolean;
  suppressValue?: boolean; // when true, do not pass value to ReactQuill (uncontrolled rendering)
}

export const EditorContent: React.FC<EditorContentProps> = ({
  editorContent,
  quillRef,
  handleChange,
  handleChangeSelection,
  handleEditorClick,
  handleMouseMove,
  handleMouseLeave,
  readOnly = false,
  suppressValue = false
}) => {
  const valueToUse = editorContent || ({ ops: [{ insert: '\n' }] } as DeltaStatic);
  return (
    <div onClick={handleEditorClick} onMouseDown={handleEditorClick} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <ReactQuill
        ref={quillRef}
        theme="snow"
        {...(suppressValue ? {} : { value: valueToUse })}
        onChange={handleChange}
        onChangeSelection={handleChangeSelection}
        readOnly={readOnly}
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

// Use React.memo to prevent unnecessary re-renders
export default React.memo(EditorContent);
