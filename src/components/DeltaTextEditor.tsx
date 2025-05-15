
import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TextEditorActions } from '@/components/editor/TextEditorActions';
import { DeltaStatic } from '@/utils/editor/quill-types';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useEditorInitializer } from '@/hooks/editor/useEditorInitializer';
import { useEditorFormat } from '@/hooks/editor/useEditorFormat';
import { EditorContent } from '@/components/editor/EditorContent';
import { toDelta } from '@/utils/delta/deltaUtils';
import { EditorDialogs } from '@/components/editor/EditorDialogs';
import { useEditorSubmitHandlers } from '@/hooks/editor/useEditorSubmitHandlers';
import { useSuggestionManager } from '@/hooks/suggestion/useSuggestionManager';

interface DeltaTextEditorProps {
  scriptId: string;
  isAdmin: boolean;
  onCommitToGithub?: (content: string) => Promise<boolean>;
  onSaveVersion?: (content: string) => void;
  pendingSuggestionsCount?: number;
  hasPendingSuggestions?: boolean;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({
  scriptId,
  isAdmin,
  onCommitToGithub,
  onSaveVersion,
  pendingSuggestionsCount = 0,
  hasPendingSuggestions = false
}) => {
  const [editorContent, setEditorContent] = useState<DeltaStatic | null>(null);
  const quillRef = useRef<ReactQuill>(null);
  
  // Initialize hooks
  const { content, isLoading, userId } = useTextEditor(scriptId, isAdmin);
  const { submitEdits, submitAsSuggestion, isSaving } = useSubmitEdits({
    scriptId,
    isAdmin,
    userId
  });
  
  useEditorInitializer();
  const { currentFormat, handleChangeSelection, handleFormat } = useEditorFormat(quillRef);
  
  // Suggestion management
  const {
    activeSuggestion,
    popoverPosition,
    isPopoverOpen,
    showRejectDialog,
    setShowRejectDialog,
    selectedSuggestionId,
    rejectionReason,
    setRejectionReason,
    isProcessing,
    handleApproveClick,
    handleRejectClick,
    handleRejectConfirm,
    handleEditorClick,
    closeSuggestionPopover
  } = useSuggestionManager({
    scriptId,
    isAdmin,
    editorContent,
    quillRef
  });
  
  // Editor content handling
  const handleChange = (value: string, delta: DeltaStatic, source: string, editor: any) => {
    if (source === 'user') {
      // Only update content on user changes to avoid loops
      const contentDelta = editor.getContents();
      setEditorContent(contentDelta);
    }
  };

  // Submit handlers
  const { 
    handleSubmit, 
    handleSaveDraft, 
    handleSubmitSuggestion, 
    handleSaveVersion 
  } = useEditorSubmitHandlers({
    quillRef,
    userId,
    scriptId,
    isAdmin,
    submitEdits,
    submitAsSuggestion,
    onCommitToGithub,
    onSaveVersion
  });

  // Load initial content - but only once
  useEffect(() => {
    if (!isLoading && content && !editorContent) {
      setEditorContent(toDelta(content));
    }
  }, [content, isLoading, editorContent]);

  if (isLoading) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden relative">
      <TextEditorActions
        isAdmin={isAdmin}
        isSubmitting={isSaving}
        currentFormat={currentFormat}
        onFormat={handleFormat}
        onSubmit={handleSubmit}
        onSave={!isAdmin ? handleSaveDraft : undefined}
        onSaveVersion={isAdmin ? handleSaveVersion : undefined}
        onSubmitSuggestion={!isAdmin ? handleSubmitSuggestion : undefined}
        pendingSuggestionsCount={pendingSuggestionsCount}
        hasPendingSuggestions={hasPendingSuggestions}
      />
      
      <EditorContent
        editorContent={editorContent}
        quillRef={quillRef}
        handleChange={handleChange}
        handleChangeSelection={handleChangeSelection}
        handleEditorClick={handleEditorClick}
      />
      
      <EditorDialogs
        isAdmin={isAdmin}
        activeSuggestion={activeSuggestion}
        popoverPosition={popoverPosition}
        isPopoverOpen={isPopoverOpen}
        showRejectDialog={showRejectDialog}
        setShowRejectDialog={setShowRejectDialog}
        selectedSuggestionId={selectedSuggestionId}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        isProcessing={isProcessing}
        onApprove={handleApproveClick}
        onReject={handleRejectClick}
        onPopoverClose={closeSuggestionPopover}
        onRejectConfirm={handleRejectConfirm}
      />
    </div>
  );
};
