import { useEffect } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject } from '@/utils/editor';

export const useEditorLogger = (
  lineData: LineData[],
  content: any,
  lineCount: number,
  editorInitialized: boolean,
  quillRef: React.RefObject<ReactQuill>
) => {
  // Log lineData changes - Keep only essential logging
  useEffect(() => {
    if (lineData.length > 0) {
      console.log(`📋 EditorLogger: lineData updated: ${lineData.length} lines`);
      // Check for draft lines
      const draftLines = lineData.filter(line => line.hasDraft);
      if (draftLines.length > 0) {
        console.log(`📋 EditorLogger: Found ${draftLines.length} draft lines in lineData`);
      }
    }
  }, [lineData]);

  // Log editor initialization
  useEffect(() => {
    if (editorInitialized) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        console.log(`📋 EditorLogger: Editor initialized with ${lines.length} lines`);
      }
    }
  }, [editorInitialized, quillRef]);
};
