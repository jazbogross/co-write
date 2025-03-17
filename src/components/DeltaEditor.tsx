import React, { useState, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DeltaStatic } from 'quill';
import { saveContent, loadContent } from '@/utils/deltaUtils';
import Delta from 'quill-delta';

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
  
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          setUserId(user.id);
          
          const result = await loadContent(scriptId, user.id);
          
          setContent(result.contentDelta);
          setHasDraft(result.hasDraft);
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
  
  const handleChange = (value: any) => {
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
  
  const modules = {
    toolbar: [
      ['bold', 'italic'],
      [{ 'direction': 'rtl' }],
      [{ 'align': ['', 'center', 'right'] }]
    ]
  };
  
  return (
    <div className="space-y-4">
      <ReactQuill 
        ref={quillRef}
        defaultValue={content}
        onChange={handleChange}
        theme="snow"
        modules={modules}
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
