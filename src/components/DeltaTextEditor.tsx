
import React, { useEffect, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TextEditorActions } from '@/components/editor/TextEditorActions';
import { DeltaStatic } from 'quill';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useTextEditor } from '@/hooks/useTextEditor';
import { SuggestionPopover } from '@/components/suggestions/SuggestionPopover';
import { useSuggestionActions } from '@/hooks/suggestion/useSuggestionActions';
import { RejectSuggestionDialog } from '@/components/suggestions/RejectSuggestionDialog';
import { useEditorInitializer } from '@/hooks/editor/useEditorInitializer';
import { useSuggestionLoader } from '@/hooks/suggestion/useSuggestionLoader';
import { useActiveSuggestion } from '@/hooks/suggestion/useActiveSuggestion';
import { useEditorFormat } from '@/hooks/editor/useEditorFormat';
import { useEditorEvents } from '@/hooks/editor/useEditorEvents';
import { useEditorSubmitHandlers } from '@/hooks/editor/useEditorSubmitHandlers';
import { EditorContent } from '@/components/editor/EditorContent';
import { toDelta } from '@/utils/deltaUtils';

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
  const [editorContent, setEditorContent] = React.useState<DeltaStatic | null>(null);
  const quillRef = useRef<ReactQuill>(null);
  const [showRejectDialog, setShowRejectDialog] = React.useState(false);
  
  // Initialize hooks
  const { content, isLoading, userId } = useTextEditor(scriptId, isAdmin);
  const { submitEdits, submitAsSuggestion, isSaving } = useSubmitEdits({
    scriptId,
    isAdmin,
    userId
  });
  const { initialized } = useEditorInitializer();
  const { suggestions, setSuggestions, loadSuggestions } = useSuggestionLoader(scriptId, isAdmin);
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
  const { currentFormat, handleChangeSelection, handleFormat } = useEditorFormat(quillRef);
  const { handleChange, handleEditorClick } = useEditorEvents(
    quillRef, 
    suggestions, 
    isAdmin, 
    openSuggestionPopover,
    setEditorContent
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

  // Initialize suggestion actions
  const { handleApprove, handleReject, isProcessing } = useSuggestionActions(
    scriptId, 
    editorContent,
    setSuggestions,
    loadSuggestions
  );
  
  // Load suggestions when component mounts or scriptId changes
  useEffect(() => {
    if (isAdmin) {
      loadSuggestions();
    }
  }, [loadSuggestions, isAdmin]);
  
  // Apply suggestions to content when suggestions change
  useEffect(() => {
    if (!quillRef.current || !editorContent || suggestions.length === 0) return;
    
    const editor = quillRef.current.getEditor();
    
    // Clear any existing suggestion formats first
    editor.formatText(0, editor.getLength(), {
      'suggestion-add': false,
      'suggestion-remove': false
    });
    
    // Apply each suggestion's formatting
    suggestions.forEach(suggestion => {
      if (suggestion.deltaDiff && suggestion.deltaDiff.ops) {
        let index = 0;
        
        suggestion.deltaDiff.ops.forEach(op => {
          if (op.retain) {
            index += op.retain;
          } else if (op.delete) {
            // For deletions, we need to highlight text that would be deleted
            // Find the text at this position in the original content
            const textToDelete = editor.getText(index, op.delete);
            if (textToDelete) {
              // Format this text as a deletion suggestion
              editor.formatText(index, op.delete, {
                'suggestion-remove': { 
                  suggestionId: suggestion.id,
                  userId: suggestion.userId
                }
              });
            }
          } else if (op.insert) {
            // Format inserted text as an addition suggestion
            const insertLength = typeof op.insert === 'string' ? op.insert.length : 1;
            
            // Insert the suggested text
            editor.insertText(index, op.insert, {
              'suggestion-add': { 
                suggestionId: suggestion.id,
                userId: suggestion.userId
              }
            });
            
            index += insertLength;
          }
        });
      }
    });
  }, [suggestions, editorContent]);

  useEffect(() => {
    if (!isLoading && content) {
      // Make sure we convert content to DeltaStatic first
      setEditorContent(toDelta(content));
    }
  }, [content, isLoading]);

  const handleApproveClick = async (suggestionId: string) => {
    closeSuggestionPopover();
    await handleApprove([suggestionId]);
  };

  const handleRejectClick = (suggestionId: string) => {
    if (prepareRejectSuggestion(suggestionId)) {
      setShowRejectDialog(true);
    }
  };

  const handleRejectConfirm = async () => {
    if (selectedSuggestionId) {
      await handleReject(selectedSuggestionId, rejectionReason);
      setShowRejectDialog(false);
      resetRejectDialog();
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
      
      {/* Suggestion popover */}
      {isAdmin && (
        <SuggestionPopover
          suggestion={activeSuggestion}
          position={popoverPosition}
          onApprove={handleApproveClick}
          onReject={handleRejectClick}
          onClose={closeSuggestionPopover}
          open={isPopoverOpen}
          loading={isProcessing}
        />
      )}
      
      {/* Rejection reason dialog */}
      <RejectSuggestionDialog
        open={showRejectDialog}
        onOpenChange={setShowRejectDialog}
        onReject={handleRejectConfirm}
        rejectionReason={rejectionReason}
        setRejectionReason={setRejectionReason}
        isProcessing={isProcessing}
      />
    </div>
  );
};
