
import { useState, useEffect } from 'react';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, combineDeltaContents, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';

interface DraftLoaderProps {
  editorInitialized: boolean;
  draftLoadAttempted: boolean;
  lineData: LineData[];
  quillRef: React.RefObject<ReactQuill>;
  content: string | DeltaContent;
  updateEditorContent: (content: string | DeltaContent, forceUpdate?: boolean) => void;
  isAdmin: boolean;
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
      
      const editor = quillRef.current?.getEditor();
      if (!editor) {
        console.log('📙 useDraftLoader: Editor not available, skipping draft application');
        return;
      }

      try {
        if (editor.lineTracking) {
          console.log('📙 useDraftLoader: Setting programmatic update mode ON');
          editor.lineTracking.setProgrammaticUpdate(true);
        }
        
        // Process line data to ensure we have Delta objects where appropriate
        const processedLineData = lineData.map(line => {
          if (typeof line.content === 'string' && line.content.startsWith('{') && line.content.includes('"ops"')) {
            try {
              const parsedDelta = JSON.parse(line.content);
              if (parsedDelta && Array.isArray(parsedDelta.ops)) {
                console.log(`📙 useDraftLoader: Parsed stringified Delta for line ${line.lineNumber}`);
                return { ...line, content: parsedDelta };
              }
            } catch (error) {
              console.error(`📙 useDraftLoader: Error parsing stringified Delta for line ${line.lineNumber}:`, error);
            }
          }
          return line;
        });
        
        // For non-admin users, we should still update the editor content even if there are no draft lines
        // This ensures the base content is loaded regardless
        const hasDraftLines = processedLineData.some(line => line.hasDraft === true);
        
        console.log('📙 useDraftLoader: Has draft lines:', hasDraftLines);
        
        if (!hasDraftLines) {
          console.log('📙 useDraftLoader: No draft lines found, applying base content');
        }
        
        // Always process and apply content, regardless of whether there are drafts or not
        const hasDeltaContent = processedLineData.some(line => isDeltaObject(line.content));
        console.log('📙 useDraftLoader: Has Delta content:', hasDeltaContent);
        
        if (hasDeltaContent) {
          console.log('📙 useDraftLoader: Creating combined Delta from line data');
          
          const deltaContents = processedLineData.map(line => line.content);
          const combinedDelta = combineDeltaContents(deltaContents);
          
          if (combinedDelta) {
            console.log('📙 useDraftLoader: Final Delta ops count:', combinedDelta.ops.length);
            console.log('📙 useDraftLoader: First few ops:', JSON.stringify(combinedDelta.ops.slice(0, 2)));
            updateEditorContent(combinedDelta, true); // Force update
          } else {
            console.log('📙 useDraftLoader: Failed to create combined Delta, using plain text fallback');
            const combinedContent = processedLineData.map(line => 
              typeof line.content === 'string' ? line.content : 
              extractPlainTextFromDelta(line.content)
            ).join('\n');
            
            console.log('📙 useDraftLoader: Updating editor with plain text fallback');
            updateEditorContent(combinedContent, true); // Force update
          }
        } else {
          console.log('📙 useDraftLoader: Creating combined content from strings');
          const combinedContent = processedLineData.map(line => {
            return typeof line.content === 'string' ? 
              line.content : 
              extractPlainTextFromDelta(line.content);
          }).join('\n');
          
          console.log('📙 useDraftLoader: Updating editor content, content length:', combinedContent.length);
          updateEditorContent(combinedContent, true); // Force update
        }
        
        setDraftApplied(true);
        console.log('📙 useDraftLoader: Content application complete');
      } finally {
        if (editor && editor.lineTracking) {
          console.log('📙 useDraftLoader: Setting programmatic update mode OFF');
          editor.lineTracking.setProgrammaticUpdate(false);
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent, isAdmin]);

  return { draftApplied };
};
