
import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { saveContent, loadContent } from '@/utils/saveLineUtils';
import { toast } from 'sonner';
import { DeltaStatic } from 'quill';

interface DeltaEditorProps {
  scriptId: string;
  isAdmin: boolean;
}

export const DeltaEditor: React.FC<DeltaEditorProps> = ({ scriptId, isAdmin }) => {
  const [content, setContent] = useState<DeltaStatic>({ ops: [{ insert: '\n' }] } as unknown as DeltaStatic);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const quillRef = useRef<ReactQuill>(null);
  
  // Load content and get user ID on mount
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Get user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          // Load content
          const { content: loadedContent, hasDraft: hasExistingDraft } = await loadContent(scriptId, user.id);
          
          setContent(loadedContent);
          setHasDraft(hasExistingDraft);
        }
      } catch (error) {
        console.error('Error loading editor content:', error);
        toast.error('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [scriptId]);
  
  // Handle content changes
  const handleChange = (value: any) => {
    // Note: We don't update state for every change to avoid performance issues
    // The content is saved directly when the user clicks "Save"
  };
  
  // Save content
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
  
  // Create a suggestion (non-admin users)
  const handleSubmitSuggestion = async () => {
    if (!quillRef.current || !userId || isAdmin) return;
    
    setIsSaving(true);
    
    try {
      // Get current content
      const suggestedContent = quillRef.current.getEditor().getContents();
      
      // Load original content (not the draft)
      const { data } = await supabase
        .from('script_content')
        .select('content_delta')
        .eq('script_id', scriptId)
        .single();
      
      if (!data?.content_delta) {
        toast.error('Could not load original content to compare');
        return;
      }
      
      // Calculate diff between original and suggestion
      const originalDelta = data.content_delta as unknown as DeltaStatic;
      const diffDelta = originalDelta.diff(suggestedContent);
      
      // Only submit if there are actual changes
      if (diffDelta.ops.length <= 1) {
        toast.info('No changes detected');
        return;
      }
      
      // Save the suggestion
      const { error } = await supabase
        .from('script_suggestions')
        .insert({
          script_id: scriptId,
          user_id: userId,
          delta_diff: JSON.parse(JSON.stringify(diffDelta)),
          status: 'pending'
        });
      
      if (error) throw error;
      
      // Clear the draft
      await supabase
        .from('script_drafts')
        .delete()
        .eq('script_id', scriptId)
        .eq('user_id', userId);
      
      setHasDraft(false);
      toast.success('Suggestion submitted successfully');
      
      // Reload content to show original
      const { content: loadedContent } = await loadContent(scriptId, userId);
      setContent(loadedContent);
      
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
      <ReactQuill 
        ref={quillRef}
        defaultValue={content}
        onChange={handleChange}
        theme="snow"
        modules={{
          toolbar: [
            ['bold', 'italic', 'underline', 'strike'],
            ['blockquote', 'code-block'],
            [{ 'header': 1 }, { 'header': 2 }],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'script': 'sub'}, { 'script': 'super' }],
            [{ 'indent': '-1'}, { 'indent': '+1' }],
            [{ 'direction': 'rtl' }],
            [{ 'size': ['small', false, 'large', 'huge'] }],
            [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
            [{ 'color': [] }, { 'background': [] }],
            [{ 'font': [] }],
            [{ 'align': [] }],
            ['clean']
          ]
        }}
        className="bg-white h-[50vh] rounded-md"
      />
      
      <div className="flex justify-end space-x-2">
        <Button
          onClick={handleSave}
          disabled={isSaving}
        >
          {isAdmin ? 'Save Changes' : 'Save Draft'}
        </Button>
        
        {!isAdmin && (
          <Button
            variant="secondary"
            onClick={handleSubmitSuggestion}
            disabled={isSaving}
          >
            Submit Suggestion
          </Button>
        )}
      </div>
      
      {hasDraft && !isAdmin && (
        <div className="p-2 bg-yellow-50 text-yellow-600 rounded border border-yellow-200 text-sm">
          You have a draft saved. Submit your suggestion when you're ready to propose these changes to the admin.
        </div>
      )}
    </div>
  );
};
