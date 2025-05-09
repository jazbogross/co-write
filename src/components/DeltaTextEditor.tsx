
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  const [editorContent, setEditorContent] = useState<DeltaStatic | null>(null);
  const quillRef = useRef<ReactQuill>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [lastChangeSource, setLastChangeSource] = useState<string | null>(null);
  
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
  
  // Fix the handleChange function to properly update content
  const handleChange = useCallback((value: string, delta: any, source: string, editor: any) => {
    // Always update content on user changes
    if (source === 'user') {
      setLastChangeSource('user');
      
      // Capture current content from editor - this is what was missing before
      if (editor && editor.getContents) {
        const contentDelta = editor.getContents();
        setEditorContent(contentDelta);
      }
    }
  }, []);
  
  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    if (!quillRef.current || !isAdmin) return;
    
    const editor = quillRef.current.getEditor();
    const editorBounds = editor.root.getBoundingClientRect();
    
    // Check if clicked element has suggestion class
    const element = event.target as HTMLElement;
    const isSuggestionAdd = element.classList.contains('ql-suggestion-add');
    const isSuggestionRemove = element.classList.contains('ql-suggestion-remove');
    
    if ((isSuggestionAdd || isSuggestionRemove) && isAdmin) {
      const suggestionId = element.getAttribute('data-suggestion-id');
      
      if (suggestionId) {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        
        if (suggestion) {
          // Position popover next to the clicked element
          openSuggestionPopover(
            suggestion, 
            {
              x: event.clientX - editorBounds.left + editorBounds.width / 2,
              y: event.clientY - editorBounds.top
            }
          );
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  }, [quillRef, isAdmin, suggestions, openSuggestionPopover]);

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
  
  // Only load suggestions when component mounts or scriptId changes - not on every render
  useEffect(() => {
    if (isAdmin) {
      loadSuggestions();
    }
  }, [loadSuggestions, isAdmin]);
  
  // Apply suggestions to content but prevent infinite loops
  useEffect(() => {
    if (!quillRef.current || !editorContent || suggestions.length === 0) return;
    
    // Skip processing if the last change wasn't user-initiated
    if (lastChangeSource !== 'user' && lastChangeSource !== null) return;
    
    const editor = quillRef.current.getEditor();
    
    // Clear any existing suggestion formats first
    editor.formatText(0, editor.getLength(), {
      'suggestion-add': false,
      'suggestion-remove': false
    });
    
    // Apply each suggestion's formatting with a careful approach
    // to avoid reflow issues
    try {
      suggestions.forEach(suggestion => {
        if (suggestion.deltaDiff && suggestion.deltaDiff.ops) {
          let index = 0;
          
          suggestion.deltaDiff.ops.forEach(op => {
            if (op.retain) {
              index += op.retain;
            } else if (op.delete) {
              // For deletions, we need to highlight text that would be deleted
              editor.formatText(index, op.delete, {
                'suggestion-remove': { 
                  suggestionId: suggestion.id,
                  userId: suggestion.userId
                }
              });
            } else if (op.insert) {
              // Format inserted text as an addition suggestion
              const insertLength = typeof op.insert === 'string' ? op.insert.length : 1;
              
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
      
      // Reset the change source to prevent further processing
      setLastChangeSource(null);
    } catch (error) {
      console.error('Error applying suggestions to editor:', error);
    }
  }, [suggestions, editorContent, lastChangeSource]);

  // Load initial content - but only once
  useEffect(() => {
    if (!isLoading && content && !editorContent) {
      // Make sure we convert content to DeltaStatic first
      setEditorContent(toDelta(content));
    }
  }, [content, isLoading, editorContent]);

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
