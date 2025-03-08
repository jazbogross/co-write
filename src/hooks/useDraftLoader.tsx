
import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (editorInitialized && draftLoadAttempted && lineData.length > 0 && !draftApplied) {
      console.log('📙 useDraftLoader: Applying drafts to editor. LineData length:', lineData.length);
      const editor = quillRef.current?.getEditor();
      if (editor) {
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
            
            // Log content for debugging
            deltaContents.forEach((content, i) => {
              console.log(`📙 useDraftLoader: Content ${i+1} type:`, 
                typeof content, 
                isDeltaObject(content) ? 'isDelta' : 'notDelta'
              );
            });
            
            const combinedDelta = combineDeltaContents(deltaContents);
            
            if (combinedDelta) {
              console.log('📙 useDraftLoader: Final Delta ops count:', combinedDelta.ops.length);
              console.log('📙 useDraftLoader: First few ops:', JSON.stringify(combinedDelta.ops.slice(0, 3)));
              updateEditorContent(combinedDelta);
              
              // After updating content, ensure UUIDs are refreshed in the DOM
              setTimeout(() => {
                if (editor.lineTracking && typeof editor.lineTracking.refreshLineUuids === 'function') {
                  console.log('📙 useDraftLoader: Refreshing line UUIDs from lineData');
                  editor.lineTracking.refreshLineUuids(lineData);
                }
              }, 50);
            } else {
              console.log('📙 useDraftLoader: Failed to create combined Delta, using plain text fallback');
              const combinedContent = lineData.map(line => 
                typeof line.content === 'string' ? line.content : 
                extractPlainTextFromDelta(line.content)
              ).join('\n');
              
              if (typeof content === 'string' && combinedContent !== content) {
                console.log('📙 useDraftLoader: Updating editor with plain text fallback');
                updateEditorContent(combinedContent);
              }
            }
          } else {
            console.log('📙 useDraftLoader: Creating combined content from strings');
            const combinedContent = lineData.map(line => {
              return typeof line.content === 'string' ? 
                line.content : 
                extractPlainTextFromDelta(line.content);
            }).join('\n');
            
            if (typeof content === 'string' && combinedContent !== content) {
              console.log('📙 useDraftLoader: Updating editor content from loaded drafts');
              updateEditorContent(combinedContent);
            } else {
              console.log('📙 useDraftLoader: Content unchanged, skipping update');
            }
          }
          
          setDraftApplied(true);
          console.log('📙 useDraftLoader: Draft application complete');
        } finally {
          if (editor.lineTracking) {
            console.log('📙 useDraftLoader: Setting programmatic update mode OFF');
            editor.lineTracking.setProgrammaticUpdate(false);
          }
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent]);

  return { draftApplied };
};
