import { useState, useCallback, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from '@/utils/editor/quill-types';
import { Suggestion } from '@/components/suggestions/types';
import { toast } from 'sonner';
import { useSuggestionLoader } from '@/hooks/suggestion/useSuggestionLoader';
import { approveSuggestion, rejectSuggestion } from '@/services/suggestionService';

interface UseSuggestionManagerProps {
  scriptId: string;
  isAdmin: boolean;
  editorContent: DeltaStatic | null;
  quillRef: React.RefObject<ReactQuill>;
}

export function useSuggestionManager({
  scriptId,
  isAdmin,
  editorContent,
  quillRef
}: UseSuggestionManagerProps) {
  // Load suggestions
  const { suggestions, loadSuggestions, isLoading: isSuggestionsLoading } = 
    useSuggestionLoader(scriptId, isAdmin);
  
  // Suggestion popover state
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{x: number, y: number} | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  
  // Suggestion rejection state
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);

  // Load suggestions on component mount
  useEffect(() => {
    if (isAdmin) {
      loadSuggestions();
    }
  }, [loadSuggestions, isAdmin]);

  // Open suggestion popover
  const openSuggestionPopover = useCallback((suggestion: Suggestion, position: {x: number, y: number}) => {
    setActiveSuggestion(suggestion);
    setPopoverPosition(position);
    setIsPopoverOpen(true);
  }, []);

  // Close suggestion popover
  const closeSuggestionPopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);

  // Prepare to reject a suggestion
  const prepareRejectSuggestion = useCallback((suggestionId: string) => {
    setSelectedSuggestionId(suggestionId);
    setIsPopoverOpen(false);
    return true;
  }, []);

  // Reset reject dialog
  const resetRejectDialog = useCallback(() => {
    setSelectedSuggestionId(null);
    setRejectionReason('');
  }, []);

  // Approve suggestion
  const handleApprove = useCallback(async (ids: string[]) => {
    if (ids.length === 0 || !editorContent) return;
    
    setIsProcessing(true);
    try {
      for (const id of ids) {
        await approveSuggestion(
          scriptId,
          id,
          editorContent
        );
      }

      toast.success(ids.length > 1 
        ? `${ids.length} suggestions approved` 
        : "Suggestion approved and changes applied");
      
      // Reload suggestions to get fresh data
      loadSuggestions();
    } catch (error) {
      console.error('Error approving suggestion:', error);
      toast.error("Failed to approve suggestion");
    } finally {
      setIsProcessing(false);
    }
  }, [scriptId, editorContent, loadSuggestions]);

  // Reject suggestion
  const handleReject = useCallback(async (id: string, reason: string) => {
    if (!id) return;

    setIsProcessing(true);
    try {
      await rejectSuggestion(id, reason);

      toast.success("Suggestion rejected");
      
      // Reload suggestions to get fresh data
      loadSuggestions();
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      toast.error("Failed to reject suggestion");
    } finally {
      setIsProcessing(false);
    }
  }, [loadSuggestions]);

  // Handle approve click
  const handleApproveClick = useCallback(async (suggestionId: string) => {
    closeSuggestionPopover();
    await handleApprove([suggestionId]);
  }, [handleApprove, closeSuggestionPopover]);

  // Handle reject click
  const handleRejectClick = useCallback((suggestionId: string) => {
    if (prepareRejectSuggestion(suggestionId)) {
      setShowRejectDialog(true);
    }
  }, [prepareRejectSuggestion]);

  // Handle reject confirm
  const handleRejectConfirm = useCallback(async () => {
    if (selectedSuggestionId) {
      await handleReject(selectedSuggestionId, rejectionReason);
      setShowRejectDialog(false);
      resetRejectDialog();
    }
  }, [handleReject, resetRejectDialog, selectedSuggestionId, rejectionReason]);

  // Handle editor click to detect clicks on suggestion formatting
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

  // Apply suggestions to content
  useEffect(() => {
    if (!quillRef.current || !editorContent || suggestions.length === 0) return;
    
    const editor = quillRef.current.getEditor();
    
    // Clear any existing suggestion formats first
    editor.formatText(0, editor.getLength(), {
      'suggestion-add': false,
      'suggestion-remove': false
    });
    
    // Apply each suggestion's formatting
    try {
      suggestions.forEach(suggestion => {
        if (suggestion.deltaDiff && suggestion.deltaDiff.ops) {
          let index = 0;
          
          suggestion.deltaDiff.ops.forEach(op => {
            if (op.retain) {
              // Safely handle retain when it could be either a number or a Record
              if (typeof op.retain === 'number') {
                index += op.retain;
              }
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
              const insertContent = op.insert;
              // Only process strings, not objects like images
              if (typeof insertContent === 'string') {
                editor.insertText(index, insertContent, {
                  'suggestion-add': { 
                    suggestionId: suggestion.id,
                    userId: suggestion.userId
                  }
                });
                
                index += insertContent.length;
              } else {
                // For non-string inserts like embeds, just increment by 1
                index += 1;
              }
            }
          });
        }
      });
    } catch (error) {
      console.error('Error applying suggestions to editor:', error);
    }
  }, [suggestions, editorContent, quillRef]);

  return {
    suggestions,
    activeSuggestion,
    popoverPosition,
    isPopoverOpen,
    showRejectDialog,
    setShowRejectDialog,
    selectedSuggestionId,
    rejectionReason,
    setRejectionReason,
    isProcessing,
    isSuggestionsLoading,
    handleApproveClick,
    handleRejectClick,
    handleRejectConfirm,
    handleEditorClick,
    closeSuggestionPopover
  };
}
