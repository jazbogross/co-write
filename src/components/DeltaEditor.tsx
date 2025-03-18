
import React, { useEffect, useState } from 'react';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { saveContent, loadContent } from '@/utils/deltaUtils';
import Delta from 'quill-delta';
import { useEditorContent } from '@/hooks/useEditorContent';
import { EditorContent } from '@/components/editor/EditorContent';
import { EditorActions } from '@/components/editor/EditorActions';
import { InlineSuggestionReviewer } from '@/components/suggestions/InlineSuggestionReviewer';
import { registerSuggestionFormats } from '@/utils/editor/formats/SuggestionFormat';
import { DeltaStatic } from 'quill';
import { fetchSuggestions } from '@/services/suggestionService';

interface DeltaEditorProps {
  scriptId: string;
  isAdmin: boolean;
}

export const DeltaEditor: React.FC<DeltaEditorProps> = ({ scriptId, isAdmin }) => {
  const {
    content,
    setContent,
    userId,
    isLoading,
    hasDraft,
    setHasDraft,
    isSaving,
    setIsSaving,
    quillRef
  } = useEditorContent(scriptId, isAdmin);
  
  const [pendingSuggestions, setPendingSuggestions] = useState<any[]>([]);
  const [hasAppliedAllSuggestions, setHasAppliedAllSuggestions] = useState(true);
  const [refreshEditor, setRefreshEditor] = useState(0);
  
  // Fetch pending suggestions
  useEffect(() => {
    if (!isAdmin || !scriptId) return;
    
    const loadSuggestions = async () => {
      try {
        const suggestions = await fetchSuggestions(scriptId);
        setPendingSuggestions(suggestions);
        setHasAppliedAllSuggestions(suggestions.length === 0);
      } catch (error) {
        console.error('Error loading suggestions:', error);
        toast.error('Failed to load suggestions');
      }
    };
    
    loadSuggestions();
  }, [scriptId, isAdmin, refreshEditor]);
  
  // Apply suggestion formatting to editor when content and suggestions are loaded
  useEffect(() => {
    if (!isAdmin || !quillRef.current || pendingSuggestions.length === 0) return;
    
    const applyFormattingToEditor = () => {
      try {
        // Register suggestion formats
        const Quill = quillRef.current?.getEditor().constructor;
        registerSuggestionFormats(Quill);
        
        // Get current editor content
        const editor = quillRef.current.getEditor();
        const currentContent = editor.getContents() as DeltaStatic;
        
        // Apply all suggestion diffs as formatting
        let formattedContent = currentContent;
        
        pendingSuggestions.forEach(suggestion => {
          const suggestionDelta = new Delta(suggestion.delta_diff.ops || []);
          
          // Format deleted content
          suggestionDelta.ops?.forEach(op => {
            if (op.delete) {
              // Find text to delete and add deletion formatting
              // This is simplified - a real implementation would need to find exact positions
              editor.formatText(0, editor.getText().length, 'suggestion-deletion', false);
            } else if (op.insert) {
              // Find inserted text and add addition formatting
              const text = typeof op.insert === 'string' ? op.insert : '';
              const index = editor.getText().indexOf(text);
              if (index >= 0) {
                editor.formatText(index, text.length, 'suggestion-addition', true);
              }
            }
          });
        });
      } catch (error) {
        console.error('Error applying suggestion formatting:', error);
      }
    };
    
    // Apply formatting after a short delay to ensure editor is initialized
    const timer = setTimeout(applyFormattingToEditor, 500);
    return () => clearTimeout(timer);
  }, [pendingSuggestions, quillRef.current, content, isAdmin]);
  
  const handleChange = (value: any) => {
    // This is intentionally empty as changes are captured by the quill reference
  };
  
  const handleSave = async () => {
    if (!quillRef.current || !userId) return;
    
    // Prevent saving if there are pending suggestions for admin
    if (isAdmin && pendingSuggestions.length > 0) {
      toast.error('Please review all suggestions before saving');
      return;
    }
    
    setIsSaving(true);
    
    try {
      const currentContent = quillRef.current.getEditor().getContents();
      
      const success = await saveContent(scriptId, currentContent, userId, isAdmin);
      
      if (success) {
        toast.success(isAdmin ? 'Content updated successfully' : 'Draft saved successfully');
        
        if (!isAdmin) {
          setHasDraft(true);
        }
      } else {
        toast.error('Failed to save content');
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSubmitSuggestion = async () => {
    if (!quillRef.current || !userId || isAdmin) return;
    
    setIsSaving(true);
    
    try {
      const suggestedContent = quillRef.current.getEditor().getContents();
      
      const { data } = await supabase
        .from('script_content')
        .select('content_delta')
        .eq('script_id', scriptId)
        .single();
      
      if (!data?.content_delta) {
        toast.error('Could not load original content to compare');
        return;
      }
      
      const contentDeltaData = typeof data.content_delta === 'string' 
        ? JSON.parse(data.content_delta) 
        : data.content_delta;
        
      const originalDelta = new Delta(contentDeltaData.ops || []);
      
      const suggestedDelta = new Delta(suggestedContent.ops || []);
      
      const diffDelta = originalDelta.diff(suggestedDelta);
      
      if (diffDelta.ops?.length <= 1) {
        toast.info('No changes detected');
        return;
      }
      
      const { error } = await supabase
        .from('script_suggestions')
        .insert({
          script_id: scriptId,
          user_id: userId,
          delta_diff: JSON.parse(JSON.stringify(diffDelta)),
          status: 'pending'
        });
      
      if (error) throw error;
      
      await supabase
        .from('script_drafts')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId);
      
      setHasDraft(false);
      toast.success('Suggestion submitted successfully');
      
      const result = await loadContent(scriptId, userId);
      setContent(result.contentDelta);
      
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleSuggestionAction = async (suggestionId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      if (action === 'approve') {
        // Approve the suggestion
        const { data, error } = await supabase
          .from('script_suggestions')
          .update({ status: 'approved' })
          .eq('id', suggestionId)
          .select()
          .single();
          
        if (error) throw error;
        
        // Apply the suggestion to the content
        if (data && quillRef.current) {
          const editor = quillRef.current.getEditor();
          const currentContent = editor.getContents() as DeltaStatic;
          const suggestionDelta = new Delta(data.delta_diff.ops || []);
          const newContent = currentContent.compose(suggestionDelta);
          editor.setContents(newContent);
        }
      } else {
        // Reject the suggestion
        const { error } = await supabase
          .from('script_suggestions')
          .update({ 
            status: 'rejected',
            rejection_reason: reason || 'No reason provided'
          })
          .eq('id', suggestionId);
          
        if (error) throw error;
      }
      
      // Refresh suggestions
      setRefreshEditor(prev => prev + 1);
      toast.success(`Suggestion ${action === 'approve' ? 'approved' : 'rejected'} successfully`);
    } catch (error) {
      console.error(`Error ${action}ing suggestion:`, error);
      toast.error(`Failed to ${action} suggestion`);
    }
  };
  
  if (isLoading) {
    return <div>Loading editor...</div>;
  }
  
  return (
    <div className="space-y-0">
      <EditorActions 
        isAdmin={isAdmin}
        isSaving={isSaving}
        hasDraft={hasDraft}
        handleSave={handleSave}
        handleSubmitSuggestion={handleSubmitSuggestion}
        disableSave={isAdmin && pendingSuggestions.length > 0}
      />

      {isAdmin && pendingSuggestions.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 p-2 text-amber-600 text-sm">
          {pendingSuggestions.length} pending suggestions need to be reviewed before saving.
        </div>
      )}

      <EditorContent 
        content={content} 
        quillRef={quillRef} 
        handleChange={handleChange} 
      />
      
      {isAdmin && pendingSuggestions.length > 0 && (
        <InlineSuggestionReviewer
          scriptId={scriptId}
          suggestions={pendingSuggestions}
          onAction={handleSuggestionAction}
        />
      )}
    </div>
  );
};
