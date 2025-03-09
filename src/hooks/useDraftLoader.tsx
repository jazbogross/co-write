
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, combineDeltaContents, extractPlainTextFromDelta } from '@/utils/editor';
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
  const updateInProgressRef = useRef(false);
  const lastLineDataRef = useRef<LineData[]>([]);
  const appliedLineCountRef = useRef<number>(0);

  // Track when applying drafts so we can validate success
  const [applyingDrafts, setApplyingDrafts] = useState(false);
  const draftsAppliedTimestampRef = useRef<number | null>(null);

  useEffect(() => {
    // Reset draft applied state when lineData changes
    if (lineData !== lastLineDataRef.current) {
      setDraftApplied(false);
      lastLineDataRef.current = lineData;
      console.log('📙 useDraftLoader: LineData changed, reset draft applied state');
    }
  }, [lineData]);

  // Verify draft application after 100ms
  useEffect(() => {
    if (!applyingDrafts && draftsAppliedTimestampRef.current !== null) {
      const timestamp = draftsAppliedTimestampRef.current;
      draftsAppliedTimestampRef.current = null;
      
      // Check after a short delay if the content was actually applied
      const timeoutId = setTimeout(() => {
        const editor = quillRef.current?.getEditor();
        if (!editor) return;
        
        const lines = editor.getLines(0);
        console.log(`📙 useDraftLoader: Verifying draft application, expected ${appliedLineCountRef.current} lines, found ${lines.length} lines`);
        
        if (lines.length < appliedLineCountRef.current) {
          console.log(`📙 useDraftLoader: Content not properly applied, reapplying with force update`);
          applyDrafts(true); // Force update to ensure content is applied
        }
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [applyingDrafts, quillRef]);

  // Main draft application effect
  useEffect(() => {
    if (!editorInitialized || 
        !draftLoadAttempted || 
        lineData.length === 0 || 
        draftApplied || 
        updateInProgressRef.current || 
        applyingDrafts) {
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) {
      return;
    }

    applyDrafts();
    
  }, [
    lineData,
    editorInitialized,
    draftLoadAttempted,
    draftApplied,
    quillRef,
    content,
    updateEditorContent,
    applyingDrafts
  ]);

  const applyDrafts = async (forceUpdate = false) => {
    setApplyingDrafts(true);
    updateInProgressRef.current = true;
    console.log('📙 useDraftLoader: Applying drafts to editor. LineData length:', lineData.length);

    try {
      const editor = quillRef.current?.getEditor();
      if (!editor) {
        throw new Error('Editor not available');
      }
      
      if (editor.lineTracking) {
        console.log('📙 useDraftLoader: Setting programmatic update mode ON');
        editor.lineTracking.setProgrammaticUpdate(true);
      }
      
      // Log the UUIDs present in lineData
      console.log('📙 useDraftLoader: LineData UUIDs:', lineData.map(line => line.uuid));
      
      const hasDeltaContent = lineData.some(line => isDeltaObject(line.content));
      console.log('📙 useDraftLoader: Has Delta content:', hasDeltaContent);
      
      if (hasDeltaContent) {
        console.log('📙 useDraftLoader: Creating combined Delta from line data');
        
        // Filter out only active lines that have content
        const deltaContents = lineData
          .filter(line => line.content !== null && line.content !== undefined)
          .map(line => line.content);
          
        console.log('📙 useDraftLoader: Processing', deltaContents.length, 'content items');
        
        const combinedDelta = combineDeltaContents(deltaContents);
        
        if (combinedDelta) {
          console.log('📙 useDraftLoader: Final Delta ops count:', combinedDelta.ops.length);
          
          // Save expected line count for validation
          appliedLineCountRef.current = lineData.length;
          
          // Force update to ensure content is actually applied
          updateEditorContent(combinedDelta, forceUpdate);
          
          // Wait for content update to complete before refreshing UUIDs
          await new Promise(resolve => setTimeout(resolve, 50));
          
          if (editor.lineTracking?.refreshLineUuids) {
            console.log('📙 useDraftLoader: Refreshing line UUIDs from lineData');
            editor.lineTracking.refreshLineUuids(lineData);
          }
        } else {
          console.log('📙 useDraftLoader: Failed to create combined Delta, using plain text fallback');
          const combinedContent = lineData
            .map(line => typeof line.content === 'string' ? 
              line.content : 
              extractPlainTextFromDelta(line.content)
            )
            .join('\n');
          
          if (combinedContent) {
            updateEditorContent(combinedContent, forceUpdate);
          }
        }
      } else {
        console.log('📙 useDraftLoader: Creating combined content from strings');
        const combinedContent = lineData
          .map(line => typeof line.content === 'string' ? 
            line.content : 
            extractPlainTextFromDelta(line.content)
          )
          .join('\n');
        
        if (combinedContent) {
          updateEditorContent(combinedContent, forceUpdate);
        }
      }
      
      // Verify line count matches expected
      const verifyLines = editor.getLines(0);
      console.log(`📙 useDraftLoader: Applied content, expected ${lineData.length} lines, found ${verifyLines.length} lines`);
      
      setDraftApplied(true);
      draftsAppliedTimestampRef.current = Date.now();
      console.log('📙 useDraftLoader: Draft application complete');
    } catch (error) {
      console.error('📙 useDraftLoader: Error applying drafts:', error);
      setDraftApplied(false);
    } finally {
      const editor = quillRef.current?.getEditor();
      if (editor && editor.lineTracking) {
        console.log('📙 useDraftLoader: Setting programmatic update mode OFF');
        editor.lineTracking.setProgrammaticUpdate(false);
      }
      updateInProgressRef.current = false;
      setApplyingDrafts(false);
    }
  };

  return { draftApplied, applyDrafts };
};
