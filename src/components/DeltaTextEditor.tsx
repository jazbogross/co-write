
import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { useSession } from '@supabase/auth-helpers-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TextEditorActions } from './editor/TextEditorActions';
import { loadContent, saveContent } from '@/utils/saveUtils';
import { SaveVersionDialog } from '@/components/editor/SaveVersionDialog';

interface DeltaTextEditorProps {
  scriptId: string;
  isAdmin: boolean;
  onCommitToGithub?: (content: string) => Promise<boolean>;
  onSaveVersion?: (content: string) => void;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({ 
  scriptId, 
  isAdmin,
  onCommitToGithub,
  onSaveVersion
}) => {
  const session = useSession();
  const quillRef = useRef<ReactQuill>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load content on component mount
  useEffect(() => {
    const fetchContent = async () => {
      try {
        const content = await loadContent(scriptId);
        
        if (content && quillRef.current) {
          quillRef.current.getEditor().setContents(content);
        }
      } catch (error) {
        console.error('Error loading content:', error);
        toast.error('Failed to load script content');
      }
    };
    
    fetchContent();
  }, [scriptId]);
  
  const handleFormat = (format: string, value: any) => {
    if (!quillRef.current) return;
    
    const quill = quillRef.current.getEditor();
    quill.format(format, value);
  };
  
  const handleSubmit = async () => {
    if (!quillRef.current || !session?.user?.id) {
      toast.error('You must be logged in to save changes');
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const editor = quillRef.current.getEditor();
      const delta = editor.getContents();
      const content = JSON.stringify(delta);
      
      // Save to database
      const success = await saveContent(scriptId, content, []);
      
      if (!success) {
        toast.error('Failed to save content');
        return;
      }
      
      // If admin and we should commit to GitHub
      if (isAdmin && onCommitToGithub) {
        const githubSuccess = await onCommitToGithub(content);
        if (!githubSuccess) {
          toast.warning('Content saved to database but not to GitHub');
        } else {
          toast.success('Content saved and committed to GitHub');
        }
      } else {
        toast.success('Content saved successfully');
      }
    } catch (error) {
      console.error('Error submitting content:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveDraft = async () => {
    if (!quillRef.current || !session?.user?.id) {
      toast.error('You must be logged in to save drafts');
      return;
    }
    
    try {
      const editor = quillRef.current.getEditor();
      const delta = editor.getContents();
      
      // Save to drafts table
      const { error } = await supabase
        .from('script_drafts')
        .upsert({
          script_id: scriptId,
          user_id: session.user.id,
          draft_content: delta,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'script_id,user_id'
        });
      
      if (error) {
        console.error('Error saving draft:', error);
        toast.error('Failed to save draft');
        return;
      }
      
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('An error occurred while saving draft');
    }
  };
  
  const handleSaveVersion = () => {
    if (!quillRef.current || !onSaveVersion) return;
    
    const editor = quillRef.current.getEditor();
    const delta = editor.getContents();
    const content = JSON.stringify(delta);
    
    onSaveVersion(content);
  };
  
  return (
    <div className="space-y-0">
      <TextEditorActions 
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={handleFormat}
        onSubmit={handleSubmit}
        onSave={handleSaveDraft}
        onSaveVersion={handleSaveVersion}
      />
      
      <div className="border rounded-md">
        <ReactQuill
          ref={quillRef}
          theme="snow"
          modules={{
            toolbar: false, // We're using our custom toolbar
            history: {
              delay: 2000,
              maxStack: 500,
              userOnly: true
            }
          }}
        />
      </div>
    </div>
  );
};
