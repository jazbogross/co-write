
import { useCallback } from 'react';
import ReactQuill from 'react-quill';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';

interface UseEditorSubmitHandlersProps {
  quillRef: React.RefObject<ReactQuill>;
  userId: string | null;
  scriptId: string;
  isAdmin: boolean;
  submitEdits: (delta: DeltaStatic, options?: { asDraft?: boolean }) => Promise<boolean>;
  submitAsSuggestion: (lineData: any[], originalContent: any) => Promise<{ success: boolean }>;
  onCommitToGithub?: (content: string) => Promise<boolean>;
  onSaveVersion?: (content: string) => void;
}

export const useEditorSubmitHandlers = ({
  quillRef,
  userId,
  scriptId,
  isAdmin,
  submitEdits,
  submitAsSuggestion,
  onCommitToGithub,
  onSaveVersion
}: UseEditorSubmitHandlersProps) => {
  const handleSubmit = useCallback(async () => {
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
  }, [userId, isAdmin, quillRef, submitEdits, onCommitToGithub]);

  const handleSaveDraft = useCallback(async () => {
    if (!userId || isAdmin || !quillRef.current) return;
    
    try {
      const delta = quillRef.current.getEditor().getContents();
      await submitEdits(delta, { asDraft: true });
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  }, [userId, isAdmin, quillRef, submitEdits]);

  const handleSubmitSuggestion = useCallback(async () => {
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
  }, [userId, isAdmin, quillRef, scriptId, submitAsSuggestion]);

  const handleSaveVersion = useCallback(async () => {
    if (!onSaveVersion || !quillRef.current) return;
    
    const delta = quillRef.current.getEditor().getContents();
    onSaveVersion(JSON.stringify(delta));
  }, [onSaveVersion, quillRef]);

  return {
    handleSubmit,
    handleSaveDraft,
    handleSubmitSuggestion,
    handleSaveVersion
  };
};
