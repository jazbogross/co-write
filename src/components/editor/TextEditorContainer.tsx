
import React from 'react';
import { TextEditorToolbar } from './TextEditorToolbar';
import { TextEditorMain } from './TextEditorMain';
import { SuggestionsPanel } from './SuggestionsPanel';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useLineData } from '@/hooks/useLineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useDraftLoader } from '@/hooks/useDraftLoader';
import { useUserData } from '@/hooks/useUserData';
import { useEditorLogger } from '@/hooks/useEditorLogger';
import { useEditorOperations } from './TextEditorOperations';
import { DeltaContent } from '@/utils/editor/types';

interface TextEditorContainerProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string | DeltaContent) => void;
}

export const TextEditorContainer: React.FC<TextEditorContainerProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = React.useState(true);
  const [isContentLoaded, setIsContentLoaded] = React.useState(false);
  const initializedRef = React.useRef(false);

  const { userId } = useUserData();

  const {
    lineData,
    setLineData,
    updateLineContents,
    loadDraftsForCurrentUser,
    isDataReady,
    initializeEditor,
  } = useLineData(scriptId, originalContent, userId, isAdmin);

  const {
    quillRef,
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData,
    captureCurrentContent,
    captureEditorContent,
    formats,
    modules,
    draftLoadAttempted,
  } = useTextEditor(
    originalContent,
    scriptId,
    lineData,
    setLineData,
    isDataReady,
    initializeEditor,
    updateLineContents
  );

  const { draftApplied, applyDrafts } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent: (content, forceUpdate) => {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        updateEditorContent(editor, content, forceUpdate);
      }
    }
  });

  React.useEffect(() => {
    if (userId && isDataReady && !initializedRef.current) {
      initializedRef.current = true;
      loadDraftsForCurrentUser();
    }
  }, [userId, isDataReady, loadDraftsForCurrentUser]);

  React.useEffect(() => {
    if (editorInitialized && draftApplied && !isContentLoaded) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        
        if (lines.length <= 1 && lineData.length > 1) {
          setTimeout(() => {
            applyDrafts();
          }, 100);
        } else if (lines.length > 0) {
          setIsContentLoaded(true);
        }
      }
    }
  }, [editorInitialized, draftApplied, lineData, quillRef, applyDrafts, isContentLoaded]);

  const { handleContentChange, formatText, handleSave } = useEditorOperations({
    quillRef,
    editorInitialized,
    handleChange,
    flushContentToLineData,
    captureCurrentContent,
    captureEditorContent
  });

  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    '',
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );

  if (!isDataReady) {
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  return (
    <>
      <TextEditorToolbar
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={() => handleSubmit(captureCurrentContent()?.content)}
        onSave={() => saveToSupabase(captureCurrentContent()?.content)}
      />

      <TextEditorMain
        content={content}
        lineCount={lineCount}
        quillRef={quillRef}
        modules={modules}
        formats={formats}
        onChange={handleContentChange}
      />

      {isAdmin && (
        <SuggestionsPanel
          isOpen={isSuggestionsOpen}
          scriptId={scriptId}
          onToggle={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
        />
      )}
    </>
  );
};
