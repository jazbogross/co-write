import React, { useEffect, useState, useRef, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { TextEditorActions } from '@/components/editor/TextEditorActions';
import { DeltaStatic } from 'quill';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useTextEditor } from '@/hooks/useTextEditor';
import { toDelta } from '@/utils/deltaUtils';
import Delta from 'quill-delta';
import { SuggestionPopover } from '@/components/suggestions/SuggestionPopover';
import { Suggestion } from '@/components/suggestions/types';
import { suggestionFormatCSS } from '@/utils/editor/formats';
import { useSuggestionActions } from '@/hooks/suggestion/useSuggestionActions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SuggestionFormatModule } from '@/components/editor/SuggestionFormatModule';

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
  const [currentFormat, setCurrentFormat] = useState<Record<string, any>>({});
  const [activeSuggestion, setActiveSuggestion] = useState<Suggestion | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{x: number, y: number} | null>(null);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  
  const quillRef = useRef<ReactQuill>(null);
  const { content, isLoading, userId } = useTextEditor(scriptId, isAdmin);
  const { submitEdits, submitAsSuggestion, isSaving } = useSubmitEdits({
    scriptId,
    isAdmin,
    userId
  });

  // Add styles to the head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = suggestionFormatCSS;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Register Quill modules/formats on mount
  useEffect(() => {
    if (!quillRef.current || isLoading) return;
    
    const Quill = ReactQuill.Quill;
    // Register the suggestion format module
    if (!(Quill as any)._suggestionFormatModuleRegistered) {
      SuggestionFormatModule.register(Quill);
    }
  }, [isLoading]);

  // Load suggestions
  const loadSuggestions = useCallback(async () => {
    if (!isAdmin || !scriptId) return;
    
    try {
      const { data, error } = await supabase
        .from('script_suggestions')
        .select(`
          id,
          delta_diff,
          status,
          user_id,
          created_at,
          updated_at
        `)
        .eq('script_id', scriptId)
        .eq('status', 'pending');

      if (error) throw error;
      
      // Fetch usernames for each suggestion
      const userIds = [...new Set((data || []).map(item => item.user_id))];
      const userMap: Record<string, string> = {};
      
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('profiles')
          .select('id, username')
          .in('id', userIds);
          
        (users || []).forEach(user => {
          userMap[user.id] = user.username || 'Unknown user';
        });
      }
      
      // Format suggestions with username
      const formattedSuggestions = (data || []).map(suggestion => ({
        id: suggestion.id,
        userId: suggestion.user_id,
        username: userMap[suggestion.user_id] || 'Unknown user',
        deltaDiff: toDelta(suggestion.delta_diff),
        createdAt: suggestion.created_at,
        status: suggestion.status as 'pending' | 'approved' | 'rejected',
      }));
      
      setSuggestions(formattedSuggestions);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      toast.error('Failed to load suggestions');
    }
  }, [scriptId, isAdmin]);

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
      try {
        const delta = toDelta(content);
        setEditorContent(delta);
      } catch (e) {
        console.error('Failed to parse content:', e);
        setEditorContent(toDelta({ ops: [{ insert: '\n' }] }));
      }
    }
  }, [content, isLoading]);

  const handleChange = (_value: string, _delta: DeltaStatic, _source: string, editor: any) => {
    if (editor && editor.getContents) {
      const contentDelta = editor.getContents();
      setEditorContent(contentDelta);
    }
  };

  const handleChangeSelection = (range: any, _source: string, editor: any) => {
    if (range && editor && typeof editor.getFormat === 'function') {
      try {
        const formats = editor.getFormat(range);
        setCurrentFormat(formats);
        
        // Check if selection contains a suggestion
        if (formats['suggestion-add'] || formats['suggestion-remove']) {
          const suggestionId = formats['suggestion-add']?.suggestionId || 
                               formats['suggestion-remove']?.suggestionId;
          
          if (suggestionId) {
            const suggestion = suggestions.find(s => s.id === suggestionId);
            if (suggestion) {
              // Get position for popover (near the selection)
              const bounds = editor.getBounds(range.index, range.length);
              
              // Position popover next to the selection
              setPopoverPosition({
                x: bounds.right + 10,
                y: bounds.top
              });
              
              setActiveSuggestion(suggestion);
              setIsPopoverOpen(true);
            }
          }
        } else {
          // Close popover if selection doesn't have suggestion format
          setIsPopoverOpen(false);
        }
      } catch (error) {
        console.error('Error getting format:', error);
        setCurrentFormat({});
      }
    } else {
      setCurrentFormat({});
    }
  };

  // Handler for editor click events to detect suggestions
  const handleEditorClick = (event: React.MouseEvent) => {
    if (!quillRef.current || !isAdmin) return;
    
    const editor = quillRef.current.getEditor();
    const editorBounds = editor.root.getBoundingClientRect();
    
    // Get the position relative to the editor
    const x = event.clientX - editorBounds.left;
    const y = event.clientY - editorBounds.top;
    
    // Convert to Quill coordinates
    const position = editor.getBounds(editor.getSelection()?.index || 0);
    
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
          setPopoverPosition({
            x: event.clientX - editorBounds.left + editorBounds.width / 2,
            y: event.clientY - editorBounds.top
          });
          
          setActiveSuggestion(suggestion);
          setIsPopoverOpen(true);
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  };

  const handleFormat = (format: string, value: any) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.format(format, value);
      
      const selection = editor.getSelection();
      if (selection) {
        setCurrentFormat({
          ...currentFormat,
          [format]: value
        });
      }
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('You must be logged in to save changes');
      return;
    }

    try {
      if (isAdmin && quillRef.current) {
        const delta = quillRef.current.getEditor().getContents();
        const success = await submitEdits(delta);
        
        if (success && onCommitToGithub) {
          await onCommitToGithub(JSON.stringify(delta));
        }
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleSaveDraft = async () => {
    if (!userId || isAdmin || !quillRef.current) return;
    
    try {
      const delta = quillRef.current.getEditor().getContents();
      await submitEdits(delta, { asDraft: true });
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!userId || isAdmin || !quillRef.current) return;
    
    try {
      const delta = quillRef.current.getEditor().getContents();
      
      const lineData = [{
        uuid: scriptId,
        lineNumber: 1,
        content: delta,
        originalAuthor: userId,
        editedBy: [],
        hasDraft: false
      }];
      
      const { data } = await supabase
        .from('scripts')
        .select('content')
        .eq('id', scriptId)
        .single();
        
      const originalContent = data?.content || { ops: [{ insert: '\n' }] };
      
      const result = await submitAsSuggestion(lineData, originalContent);
      
      if (result.success) {
        toast.success('Suggestion submitted successfully');
      } else {
        toast.error('Failed to submit suggestion');
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    }
  };

  const handleSaveVersion = async () => {
    if (!onSaveVersion || !quillRef.current) return;
    
    const delta = quillRef.current.getEditor().getContents();
    onSaveVersion(JSON.stringify(delta));
  };

  const handleApproveClick = async (suggestionId: string) => {
    setIsPopoverOpen(false);
    await handleApprove([suggestionId]);
  };

  const handleRejectClick = (suggestionId: string) => {
    setSelectedSuggestionId(suggestionId);
    setIsPopoverOpen(false);
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (selectedSuggestionId) {
      await handleReject(selectedSuggestionId, rejectionReason);
      setShowRejectDialog(false);
      setRejectionReason('');
      setSelectedSuggestionId(null);
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
      <div onClick={handleEditorClick}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={editorContent || toDelta({ ops: [{ insert: '\n' }] })}
          onChange={handleChange}
          onChangeSelection={handleChangeSelection}
          modules={{
            toolbar: false,
            suggestionFormat: {}
          }}
          formats={[
            'header',
            'bold',
            'italic',
            'underline',
            'strike',
            'blockquote',
            'list',
            'bullet',
            'indent',
            'link',
            'image',
            'code-block',
            'background',
            'color',
            'align',
            'direction',
            'suggestion-add',
            'suggestion-remove'
          ]}
        />
      </div>
      
      {/* Suggestion popover */}
      {isAdmin && (
        <SuggestionPopover
          suggestion={activeSuggestion}
          position={popoverPosition}
          onApprove={handleApproveClick}
          onReject={handleRejectClick}
          onClose={() => setIsPopoverOpen(false)}
          open={isPopoverOpen}
          loading={isProcessing}
        />
      )}
      
      {/* Rejection reason dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Suggestion</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="mb-4">Please provide a reason for rejecting this suggestion:</p>
            <Input
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Reason for rejection"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectConfirm}
              disabled={isProcessing}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
