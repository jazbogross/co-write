
import { useState, useCallback, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from 'quill';
import { Suggestion } from '@/components/suggestions/types';
import { toast } from 'sonner';
import { useSuggestionLoader } from '@/hooks/suggestion/useSuggestionLoader';
import { approveSuggestion, rejectSuggestion, fetchApprovedDiffsSince } from '@/services/suggestionService';
import Delta from 'quill-delta';

interface UseSuggestionManagerProps {
  scriptId: string;
  isAdmin: boolean;
  editorContent: DeltaStatic | null;
  quillRef: React.RefObject<ReactQuill>;
  // When true, render editor as a diff view with suggestions
  showDiff?: boolean;
}

export function useSuggestionManager({
  scriptId,
  isAdmin,
  editorContent,
  quillRef,
  showDiff = false
}: UseSuggestionManagerProps) {
  // Load suggestions
  const { suggestions, loadSuggestions, isLoading: isSuggestionsLoading } = 
    useSuggestionLoader(scriptId, isAdmin);
  
  // Suggestion popover state
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{x: number, y: number} | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  // Inline hover controls state
  const [hoveredSuggestionId, setHoveredSuggestionId] = useState<string | null>(null);
  const [hoverControlsPos, setHoverControlsPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverVisible, setHoverVisible] = useState(false);
  
  // Suggestion rejection state
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  
  // Loading state
  const [isProcessing, setIsProcessing] = useState(false);
  const prevShowDiffRef = useRef<boolean>(false);
  const [approvedChain, setApprovedChain] = useState<{ delta: Delta; updatedAt: string }[]>([]);

  // Load suggestions on component mount
  useEffect(() => {
    if (isAdmin) {
      loadSuggestions();
    }
  }, [loadSuggestions, isAdmin]);

  // Load approved diffs chain that might affect positioning of pending suggestions
  useEffect(() => {
    const loadApproved = async () => {
      if (!isAdmin || suggestions.length === 0) return;
      const times = suggestions
        .map((s) => s.baseUpdatedAt || s.createdAt)
        .filter(Boolean) as string[];
      if (times.length === 0) return;
      const minSince = times.reduce((a, b) => (a < b ? a : b));
      const diffs = await fetchApprovedDiffsSince(scriptId, minSince);
      setApprovedChain(diffs);
    };
    loadApproved();
  }, [scriptId, isAdmin, suggestions]);

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
      
      // Quick page refresh to ensure consistent content + suggestions
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          // Fallback: reload suggestions only
          loadSuggestions();
        }
      }, 75);
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
      
      // Quick page refresh to ensure consistent content + suggestions
      setTimeout(() => {
        try {
          window.location.reload();
        } catch {
          // Fallback: reload suggestions only
          loadSuggestions();
        }
      }, 75);
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
    const clickedSuggestion = element.closest('.ql-suggestion-add, .ql-suggestion-remove') as HTMLElement | null;
    const isSuggestionAdd = !!clickedSuggestion && clickedSuggestion.classList.contains('ql-suggestion-add');
    const isSuggestionRemove = !!clickedSuggestion && clickedSuggestion.classList.contains('ql-suggestion-remove');
    
    if ((isSuggestionAdd || isSuggestionRemove) && isAdmin) {
      const suggestionId = clickedSuggestion?.getAttribute('data-suggestion-id');
      
      if (suggestionId) {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        
        if (suggestion) {
          // Position popover anchored to the suggestion element
          const rect = clickedSuggestion.getBoundingClientRect();
          const pos = {
            x: Math.round(rect.left - editorBounds.left + rect.width / 2),
            y: Math.round(rect.bottom - editorBounds.top + 6)
          };
          openSuggestionPopover(suggestion, pos);
          if (event.preventDefault) event.preventDefault();
          if (event.stopPropagation) event.stopPropagation();
          const native = (event as any).nativeEvent;
          if (native && typeof native.stopImmediatePropagation === 'function') native.stopImmediatePropagation();
        }
      }
    }
  }, [quillRef, isAdmin, suggestions, openSuggestionPopover]);

  // Hover controls handlers
  const handleMouseMove = useCallback((event: React.MouseEvent) => {
    if (!quillRef.current || !isAdmin) return;
    const editor = quillRef.current.getEditor();
    const editorBounds = editor.root.getBoundingClientRect();
    const element = event.target as HTMLElement;
    const highlight = element.closest('.ql-suggestion-add, .ql-suggestion-remove') as HTMLElement | null;
    if (highlight) {
      const suggestionId = highlight.getAttribute('data-suggestion-id');
      if (suggestionId) {
        const rect = highlight.getBoundingClientRect();
        setHoveredSuggestionId(suggestionId);
        setHoverControlsPos({ x: Math.round(rect.right - editorBounds.left) + 6, y: Math.round(rect.top - editorBounds.top) - 8 });
        setHoverVisible(true);
        return;
      }
    }
    if (hoverVisible) setHoverVisible(false);
  }, [quillRef, isAdmin, hoverVisible]);

  const handleMouseLeave = useCallback(() => {
    if (hoverVisible) setHoverVisible(false);
  }, [hoverVisible]);

  // Apply suggestions to content
  useEffect(() => {
    if (!quillRef.current || !editorContent) return;
    const editor = quillRef.current.getEditor();
    const overlayActive = isAdmin && (showDiff || suggestions.length > 0);
    const prevOverlay = prevShowDiffRef.current;
    const enteringDiff = overlayActive && !prevOverlay;
    const exitingDiff = !overlayActive && prevOverlay;

    // On exit diff mode, reset to content once then stop
    if (exitingDiff) {
      try { editor.setContents(editorContent, 'api'); } catch {}
    }

    // If not in diff mode, avoid resetting content repeatedly
    if (!overlayActive) {
      prevShowDiffRef.current = overlayActive;
      return;
    }

    // Always reset baseline content in overlay mode only when suggestions/content change
    try { editor.setContents(editorContent, 'api'); } catch {}

    // Clear any suggestion formatting (fresh baseline)
    try { editor.formatText(0, editor.getLength(), { 'suggestion-add': false, 'suggestion-remove': false }, 'api'); } catch {}

    if (suggestions.length === 0) {
      prevShowDiffRef.current = overlayActive;
      return;
    }

    // In diff mode: overlay suggestions (rebased to current content, and adjusted for earlier pending overlays)
    try {
      // Precompute rebased deltas and sort by start index
      const items = suggestions.map((s) => {
        let d = new Delta(((s.deltaDiff as any).ops) || []);
        if (approvedChain.length > 0) {
          const baseTs = s.baseUpdatedAt || s.createdAt;
          const laterDiffs = approvedChain.filter((x) => x.updatedAt > baseTs);
          laterDiffs.forEach((x) => {
            d = x.delta.transform(d, true);
          });
        }
        // compute start index (sum of leading retains)
        let start = 0;
        for (const op of d.ops || []) {
          if (op.retain && !op.attributes) start += op.retain; else break;
        }
        return { sug: s, delta: d, start };
      }).sort((a, b) => a.start - b.start);

      // Cumulative overlay effect from pending inserts (only inserts change indices in our visual overlay)
      let cumulative = new Delta([]);

      items.forEach(({ sug, delta }) => {
        // Adjust current suggestion by prior pending overlays so indices match the live editor content
        const adjusted = cumulative.transform(delta, true);
        const ops = adjusted.ops || [];
        if (ops.length === 0) return;

        // Apply to editor
        let index = 0;
        ops.forEach((op: any) => {
          if (op.retain) {
            const len = typeof op.retain === 'number' ? op.retain : 0;
            if (op.attributes) {
              const attrs = op.attributes || {};
              const isBlockChange = (typeof attrs === 'object') && (('align' in attrs) || ('direction' in attrs));

              if (isBlockChange) {
                // Apply block attribute change (align/direction) and highlight the entire affected line(s)
                const blockLen = Math.max(len, 1);
                try { editor.formatLine(index, blockLen, attrs, 'api'); } catch {}

                // Highlight whole line(s). If len is 0 or too small, expand to full line boundaries.
                try {
                  const fullText = editor.getText(0, editor.getLength());
                  const fullLen = fullText.length;
                  let start = index;
                  while (start > 0 && fullText[start - 1] !== '\n') start--;
                  let end = Math.max(index + Math.max(len, 1) - 1, index);
                  if (end >= fullLen) end = fullLen - 1;
                  while (end < fullLen && fullText[end] !== '\n') end++;
                  // Include newline if present
                  const lineLen = Math.max(1, (end - start + (end < fullLen && fullText[end] === '\n' ? 1 : 0)));
                  editor.formatText(start, lineLen, { 'suggestion-add': { suggestionId: sug.id, userId: sug.userId } }, 'api');
                } catch {}
              } else if (len > 0) {
                // Inline attribute change: apply and highlight the exact range
                try { editor.formatText(index, len, attrs, 'api'); } catch {}
                try { editor.formatText(index, len, { 'suggestion-add': { suggestionId: sug.id, userId: sug.userId } }, 'api'); } catch {}
              }
            }
            index += len;
          } else if (op.delete) {
            // Highlight, but do not remove in the DOM
            editor.formatText(index, op.delete, { 'suggestion-remove': { suggestionId: sug.id, userId: sug.userId } }, 'api');
            index += op.delete; // traverse original text length
          } else if (op.insert) {
            const insertText = typeof op.insert === 'string' ? op.insert : '\uFFFC';
            editor.insertText(index, insertText, { 'suggestion-add': { suggestionId: sug.id, userId: sug.userId } }, 'api');
            index += insertText.length;
          }
        });

        // Update cumulative overlay: only reflect inserts (since deletes are not removed in the DOM)
        const insertOnlyOps: any[] = [];
        let ret = 0;
        ops.forEach((op: any) => {
          if (op.retain) {
            ret += op.retain;
          } else if (op.insert) {
            if (ret > 0) { insertOnlyOps.push({ retain: ret }); ret = 0; }
            insertOnlyOps.push({ insert: op.insert });
          } else if (op.delete) {
            // ignore in cumulative overlay, since we didn't delete from DOM
          }
        });
        const insertOnlyDelta = new Delta(insertOnlyOps);
        cumulative = cumulative.compose(insertOnlyDelta);
      });
    } catch (error) {
      console.error('Error applying suggestions to editor:', error);
    }
    prevShowDiffRef.current = overlayActive;
  }, [suggestions, editorContent]);

  return {
    suggestions,
    overlayActive: isAdmin && (showDiff || suggestions.length > 0),
    activeSuggestion,
    popoverPosition,
    isPopoverOpen,
    hoveredSuggestionId,
    hoverControlsPos,
    hoverVisible,
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
    handleMouseMove,
    handleMouseLeave,
    closeSuggestionPopover
  };
}
