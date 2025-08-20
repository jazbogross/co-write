
import { useState, useCallback } from 'react';
import ReactQuill from 'react-quill';

export const useEditorFormat = (quillRef: React.RefObject<ReactQuill>) => {
  const [currentFormat, setCurrentFormat] = useState<Record<string, any>>({});
  const [lastSelection, setLastSelection] = useState<{ index: number; length: number } | null>(null);

  const handleChangeSelection = useCallback((range: any, _source: string, editor: any) => {
    if (range && editor && typeof editor.getFormat === 'function') {
      try {
        const formats = editor.getFormat(range);
        setCurrentFormat(formats);
        // Track last known selection so toolbar actions can re-apply it
        if (typeof range.index === 'number' && typeof range.length === 'number') {
          setLastSelection({ index: range.index, length: range.length });
        }
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
    if (!quillRef.current) return;
    const editor = quillRef.current.getEditor();

    // Ensure the editor has focus so formatting applies
    try {
      editor.focus();
    } catch {}

    // Normalize values for Quill: use false to clear a format
    const normalizedValue = value === null ? false : value;
    // Restore previous selection if none
    let selection = editor.getSelection();
    if (!selection || typeof selection.index !== 'number') {
      if (lastSelection) {
        editor.setSelection(lastSelection.index, lastSelection.length || 0, 'silent');
      } else {
        // Fallback to end of document
        const end = editor.getLength();
        editor.setSelection(end, 0, 'silent');
      }
    }

    editor.format(format, normalizedValue, 'user');

    const newSelection = editor.getSelection();
    if (newSelection) {
      setCurrentFormat((prev) => ({
        ...prev,
        [format]: normalizedValue
      }));
    }
  }, [quillRef, lastSelection]);

  return {
    currentFormat,
    setCurrentFormat,
    handleChangeSelection,
    handleFormat
  };
};
