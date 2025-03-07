
import { useState, useEffect } from 'react';
import { LineData } from '@/hooks/useLineData';
import { isDeltaObject, combineDeltaContents, extractPlainTextFromDelta, safelyParseDelta } from '@/utils/editor';
import ReactQuill from 'react-quill';
import { DeltaContent, QuillCompatibleDelta } from '@/utils/editor/types';
import { isStringifiedDelta, parseStringifiedDeltaIfPossible } from '@/utils/lineProcessing/mappingUtils';

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
        const processedLineData = lineData.filter(line => line !== null && line !== undefined)
          .map(line => {
            if (isStringifiedDelta(line.content)) {
              try {
                const parsedDelta = parseStringifiedDeltaIfPossible(line.content);
                if (parsedDelta && typeof parsedDelta === 'object' && 'ops' in parsedDelta && Array.isArray(parsedDelta.ops)) {
                  console.log(`📙 useDraftLoader: Parsed stringified Delta for line ${line.lineNumber}`);
                  return { ...line, content: parsedDelta };
                }
              } catch (error) {
                console.error(`📙 useDraftLoader: Error parsing stringified Delta for line ${line.lineNumber}:`, error);
              }
            }
            return line;
          });
        
        console.log('📙 useDraftLoader: Processed line data count:', processedLineData.length);
        
        if (processedLineData.length === 0) {
          console.log('📙 useDraftLoader: No content to apply, skipping');
          setDraftApplied(true);
          return;
        }
        
        // Check if any of the lines have Delta content
        const hasDeltaContent = processedLineData.some(line => isDeltaObject(line.content));
        console.log('📙 useDraftLoader: Has Delta content:', hasDeltaContent);
        
        if (hasDeltaContent) {
          console.log('📙 useDraftLoader: Creating combined Delta from line data');
          
          const deltaContents = processedLineData.map(line => {
            // Ensure each line's content is properly parsed if it's a stringified Delta
            if (isStringifiedDelta(line.content)) {
              return parseStringifiedDeltaIfPossible(line.content);
            }
            
            // Log the content type for debugging
            console.log(`📙 useDraftLoader: Line ${line.lineNumber} content type:`, 
              typeof line.content, isDeltaObject(line.content) ? 'isDelta' : 'notDelta');
            
            return line.content;
          });
          
          // Log the first few deltaContents for debugging
          deltaContents.slice(0, 3).forEach((delta, i) => {
            console.log(`📙 useDraftLoader: Delta content ${i+1} type:`, 
              typeof delta, isDeltaObject(delta) ? 'isDelta' : 'notDelta',
              typeof delta === 'object' ? `has ${delta.ops?.length || 0} ops` : '');
          });
          
          const combinedDelta = combineDeltaContents(deltaContents);
          
          if (combinedDelta && combinedDelta.ops && combinedDelta.ops.length > 0) {
            console.log('📙 useDraftLoader: Final Delta ops count:', combinedDelta.ops.length);
            console.log('📙 useDraftLoader: First few ops:', JSON.stringify(combinedDelta.ops.slice(0, 2)));
            
            // Use setContents directly on the editor for Delta objects
            if (editor) {
              console.log('📙 useDraftLoader: Setting Delta contents directly on editor');
              editor.setContents(combinedDelta as any);
              
              // After setting contents, restore line tracking state
              if (editor.lineTracking) {
                // Give time for the editor to update
                setTimeout(() => {
                  if (editor.lineTracking && editor.lineTracking.refreshLineUuids) {
                    console.log('📙 useDraftLoader: Refreshing line UUIDs after setting content');
                    editor.lineTracking.refreshLineUuids(processedLineData);
                  }
                }, 50);
              }
            } else {
              updateEditorContent(combinedDelta, true); // Force update
            }
          } else {
            console.log('📙 useDraftLoader: Failed to create combined Delta, using plain text fallback');
            const combinedContent = processedLineData.map(line => 
              typeof line.content === 'string' ? line.content : 
              extractPlainTextFromDelta(line.content)
            ).join('\n');
            
            console.log('📙 useDraftLoader: Updating editor with plain text fallback, content length:', combinedContent.length);
            
            if (combinedContent.length > 0) {
              editor.setText(combinedContent);
            } else {
              console.log('📙 useDraftLoader: Empty content after processing, setting placeholder text');
              editor.setText('');
            }
          }
        } else {
          console.log('📙 useDraftLoader: Creating combined content from strings');
          const combinedContent = processedLineData.map(line => {
            return typeof line.content === 'string' ? 
              line.content : 
              extractPlainTextFromDelta(line.content);
          }).join('\n');
          
          console.log('📙 useDraftLoader: Updating editor content, content length:', combinedContent.length);
          
          if (combinedContent.length > 0) {
            editor.setText(combinedContent);
          } else {
            console.log('📙 useDraftLoader: Empty content after processing, setting placeholder text');
            editor.setText('');
          }
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
