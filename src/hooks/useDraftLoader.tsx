
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
  isAdmin: boolean; // Add isAdmin parameter to know context
}

export const useDraftLoader = ({
  editorInitialized,
  draftLoadAttempted,
  lineData,
  quillRef,
  content,
  updateEditorContent,
  isAdmin
}: DraftLoaderProps) => {
  const [draftApplied, setDraftApplied] = useState(false);

  useEffect(() => {
    if (editorInitialized && draftLoadAttempted && lineData.length > 0 && !draftApplied) {
      console.log('📙 useDraftLoader: Applying drafts to editor. LineData length:', lineData.length, 'isAdmin:', isAdmin);
      
      // Check if any lines have draft content
      const hasDraftLines = lineData.some(line => line.hasDraft === true);
      
      if (!hasDraftLines) {
        console.log('📙 useDraftLoader: No draft lines found, skipping draft application');
        setDraftApplied(true);
        return;
      }
      
      const editor = quillRef.current?.getEditor();
      if (editor) {
        try {
          if (editor.lineTracking) {
            console.log('📙 useDraftLoader: Setting programmatic update mode ON');
            editor.lineTracking.setProgrammaticUpdate(true);
          }
          
          const hasDeltaContent = lineData.some(line => isDeltaObject(line.content));
          console.log('📙 useDraftLoader: Has Delta content:', hasDeltaContent);
          
          if (hasDeltaContent) {
            console.log('📙 useDraftLoader: Creating combined Delta from line data');
            
            const deltaContents = lineData.map(line => line.content);
            const combinedDelta = combineDeltaContents(deltaContents);
            
            if (combinedDelta) {
              console.log('📙 useDraftLoader: Final Delta ops count:', combinedDelta.ops.length);
              console.log('📙 useDraftLoader: First few ops:', JSON.stringify(combinedDelta.ops.slice(0, 2)));
              updateEditorContent(combinedDelta);
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
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent, isAdmin]);

  return { draftApplied };
};
