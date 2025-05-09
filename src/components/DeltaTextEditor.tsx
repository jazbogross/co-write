
import React, { useEffect, useRef, useState } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TextEditorActions } from '@/components/editor/TextEditorActions';
import { DeltaStatic } from 'quill';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useEditorInitializer } from '@/hooks/editor/useEditorInitializer';
import { useSuggestionLoader } from '@/hooks/suggestion/useSuggestionLoader';
import { useActiveSuggestion } from '@/hooks/suggestion/useActiveSuggestion';
import { useEditorFormat } from '@/hooks/editor/useEditorFormat';
import { useSuggestionActions } from '@/hooks/suggestion/useSuggestionActions';
import { EditorContent } from '@/components/editor/EditorContent';
import { toDelta } from '@/utils/deltaUtils';
import { useSuggestionsApplier } from '@/hooks/suggestion/useSuggestionsApplier';
import { useEditorEventHandlers } from '@/hooks/editor/useEditorEventHandlers';
import { useSuggestionHandlers } from '@/hooks/suggestion/useSuggestionHandlers';
import { EditorDialogs } from '@/components/editor/EditorDialogs';
import { useEditorSubmitHandlers } from '@/hooks/editor/useEditorSubmitHandlers';

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
  const { initialized } = useEditorInitializer();
  const { suggestions, setSuggestions, loadSuggestions } = useSuggestionLoader(scriptId, isAdmin);
  const { currentFormat, handleChangeSelection, handleFormat } = useEditorFormat(quillRef);
  
  // Suggestion-related hooks
  const { 
    activeSuggestion, 
    popoverPosition, 
    isPopoverOpen, 
    selectedSuggestionId, 
    rejectionReason, 
    setRejectionReason,
    openSuggestionPopover,
    closeSuggestionPopover,
    prepareRejectSuggestion,
    resetRejectDialog
  } = useActiveSuggestion();
  
  const { isProcessing, handleApprove, handleReject } = useSuggestionActions(
    scriptId, 
    editorContent,
    setSuggestions,
    loadSuggestions
  );
  
  const { markAsUserChange } = useSuggestionsApplier(quillRef, editorContent, suggestions);
  
  const { handleChange, handleEditorClick } = useEditorEventHandlers({
    quillRef,
    setEditorContent,
    markAsUserChange,
    isAdmin,
    suggestions,
    openSuggestionPopover
  });
  
  const { 
    showRejectDialog,
    setShowRejectDialog,
    handleApproveClick,
    handleRejectClick,
    handleRejectConfirm
  } = useSuggestionHandlers(
    handleApprove,
    handleReject,
    closeSuggestionPopover,
    prepareRejectSuggestion,
    resetRejectDialog
  );

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

  // Only load suggestions when component mounts or scriptId changes
  useEffect(() => {
    if (isAdmin) {
      loadSuggestions();
    }
  }, [loadSuggestions, isAdmin]);
  
  // Load initial content - but only once
  useEffect(() => {
    if (!isLoading && content && !editorContent) {
      setEditorContent(toDelta(content));
    }
  }, [content, isLoading, editorContent]);

  const handleRejectConfirmWrapper = async () => {
    if (selectedSuggestionId) {
      await handleRejectConfirm(selectedSuggestionId, rejectionReason);
    }
  };

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
        onRejectConfirm={handleRejectConfirmWrapper}
      />
    </div>
  );
};
