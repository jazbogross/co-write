
import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { LineData } from '@/hooks/useLineData';

export const useDraftManagement = (
  editorInitialized: boolean, 
  userId: string | null,
  isDataReady: boolean,
  lineData: LineData[],
  content: string,
  quillRef: React.RefObject<ReactQuill>,
  updateEditorContent: (content: string | any) => void,
  loadDraftsForCurrentUser: () => void
) => {
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

  // Load drafts when userId becomes available
  useEffect(() => {
    if (userId && isDataReady && !draftLoadAttempted) {
      console.log('useDraftManagement: User ID available, loading drafts:', userId);
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, loadDraftsForCurrentUser, draftLoadAttempted]);

  // Force editor content update when lineData changes due to draft loading
  useEffect(() => {
    if (editorInitialized && draftLoadAttempted && lineData.length > 0 && !draftApplied) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        // Combine all line content as plain text
        const combinedContent = lineData.map(line => line.content).join('\n');
        
        // Only update if content is different
        if (combinedContent !== content) {
          console.log('useDraftManagement: Updating editor content from loaded drafts');
          
          // Use the controlled update method to prevent loops
          updateEditorContent(combinedContent);
          setDraftApplied(true);
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent]);

  return {
    draftLoadAttempted,
    draftApplied
  };
};
