import { useState, useEffect, useRef, useCallback } from 'react';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';

interface DraftLoaderProps {
  editorInitialized: boolean;
  draftLoadAttempted: boolean;
  lineData: LineData[];
  quillRef: React.RefObject<ReactQuill>;
  content: string | DeltaContent;
  updateEditorContent: (content: string | DeltaContent, forceUpdate?: boolean) => void;
}

export const useDraftLoader = ({
  editorInitialized,
  draftLoadAttempted,
  lineData,
  quillRef,
  content,
  updateEditorContent
}: DraftLoaderProps) => {
  const [draftApplied, setDraftApplied] = useState(false);
  const [loading, setLoading] = useState(false); // Use loading state instead
  const lastLineDataRef = useRef<LineData[]>([]);

  // Keep an eye on lineData
  useEffect(() => {
    // Reset draft applied state when lineData changes
    if (lineData !== lastLineDataRef.current) {
      setDraftApplied(false);
      lastLineDataRef.current = lineData;
      console.log('📙 useDraftLoader: LineData changed, reset draft applied state');
    }
  }, [lineData]);

  const applyDrafts = useCallback(async () => {
    // If already loading, skip
    if(loading) return;

    setLoading(true);
    console.log('📙 useDraftLoader: Applying drafts to editor. LineData length:', lineData.length);

    try {
      const editor = quillRef.current?.getEditor();
      if (!editor) {
        throw new Error('Editor not available');
      }

      // Log the UUIDs present in lineData
      console.log('📙 useDraftLoader: LineData UUIDs:', lineData.map(line => line.uuid));

      // Use first line's content directly
      const draftContent = lineData.length > 0 ? lineData[0].content : null;

      if (draftContent) {
        // Force update to ensure content is actually applied
        updateEditorContent(draftContent, true);
        
        // Verify line count matches expected
        const verifyLines = editor.getLines(0);
        console.log(`📙 useDraftLoader: Applied content, found ${verifyLines.length} lines`);
      } else {
        throw new Error('📙 useDraftLoader: No draft content to apply.');
      }

      setDraftApplied(true);
      console.log('📙 useDraftLoader: Draft application complete');
    } catch (error) {
      console.error('📙 useDraftLoader: Error applying drafts:', error);
      setDraftApplied(false);
      throw error; // Re-throw the error to be handled by the caller
    } finally {
      setLoading(false);
    }
  }, [lineData, quillRef, updateEditorContent]);

  // Main draft application effect
  useEffect(() => {
    if (!editorInitialized ||
      !draftLoadAttempted ||
      lineData.length === 0 ||
      draftApplied ||
      loading) {
      return;
    }

    applyDrafts();

  }, [
    editorInitialized,
    draftLoadAttempted,
    draftApplied,
    lineData,
    applyDrafts,
    loading
  ]);

  return { draftApplied, applyDrafts };
};
