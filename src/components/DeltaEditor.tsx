
import React from 'react';
import 'react-quill/dist/quill.snow.css';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { saveContent, loadContent } from '@/utils/deltaUtils';
import Delta from 'quill-delta';
import { useEditorContent } from '@/hooks/useEditorContent';
import { EditorContent } from '@/components/editor/EditorContent';
import { EditorActions } from '@/components/editor/EditorActions';

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
  
  const handleChange = (value: any) => {
    // This is intentionally empty as changes are captured by the quill reference
  };
  
  const handleSave = async () => {
    if (!quillRef.current || !userId) return;
    
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
  
  if (isLoading) {
    return <div>Loading editor...</div>;
  }
  
  return (
    
    <div className="space-y-4">
      <EditorActions 
        isAdmin={isAdmin}
        isSaving={isSaving}
        hasDraft={hasDraft}
        handleSave={handleSave}
        handleSubmitSuggestion={handleSubmitSuggestion}
      />

      <EditorContent 
        content={content} 
        quillRef={quillRef} 
        handleChange={handleChange} 
      />
      

    </div>
  );
};
