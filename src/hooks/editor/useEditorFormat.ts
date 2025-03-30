
import { useState, useCallback } from 'react';
import ReactQuill from 'react-quill';

export const useEditorFormat = (quillRef: React.RefObject<ReactQuill>) => {
  const [currentFormat, setCurrentFormat] = useState<Record<string, any>>({});

  const handleChangeSelection = useCallback((range: any, _source: string, editor: any) => {
    if (range && editor && typeof editor.getFormat === 'function') {
      try {
        const formats = editor.getFormat(range);
        setCurrentFormat(formats);
        return { range, formats };
      } catch (error) {
        console.error('Error getting format:', error);
        setCurrentFormat({});
      }
    } else {
      setCurrentFormat({});
    }
    return null;
  }, []);

  const handleFormat = useCallback((format: string, value: any) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.format(format, value);
      
      const selection = editor.getSelection();
      if (selection) {
        setCurrentFormat((prev) => ({
          ...prev,
          [format]: value
        }));
      }
    }
  }, [quillRef]);

  return {
    currentFormat,
    setCurrentFormat,
    handleChangeSelection,
    handleFormat
  };
};
