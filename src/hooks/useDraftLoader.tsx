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
  updateEditorContent: (content: string | DeltaContent) => void;
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

  useEffect(() => {
    // Reset draft applied state when lineData changes
    if (lineData !== lastLineDataRef.current) {
      setDraftApplied(false);
      lastLineDataRef.current = lineData;
    }
  }, [lineData]);

  useEffect(() => {
    if (!editorInitialized || !draftLoadAttempted || lineData.length === 0 || draftApplied || updateInProgressRef.current) {
      return;
    }

    const editor = quillRef.current?.getEditor();
    if (!editor) {
      return;
    }

    const applyDrafts = async () => {
      updateInProgressRef.current = true;
      console.log('📙 useDraftLoader: Applying drafts to editor. LineData length:', lineData.length);

      try {
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
            updateEditorContent(combinedDelta);
            
            // Wait for content update to complete before refreshing UUIDs
            await new Promise(resolve => setTimeout(resolve, 0));
            
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
            
            if (combinedContent !== content) {
              updateEditorContent(combinedContent);
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
          
          if (combinedContent !== content) {
            updateEditorContent(combinedContent);
          }
        }
        
        setDraftApplied(true);
        console.log('📙 useDraftLoader: Draft application complete');
      } catch (error) {
        console.error('📙 useDraftLoader: Error applying drafts:', error);
        setDraftApplied(false);
      } finally {
        if (editor.lineTracking) {
          console.log('📙 useDraftLoader: Setting programmatic update mode OFF');
          editor.lineTracking.setProgrammaticUpdate(false);
        }
        updateInProgressRef.current = false;
      }
    };

    applyDrafts();
  }, [
    lineData,
    editorInitialized,
    draftLoadAttempted,
    draftApplied,
    quillRef,
    content,
    updateEditorContent
  ]);

  return { draftApplied };
};
