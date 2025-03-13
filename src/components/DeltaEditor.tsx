
import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DeltaStatic } from 'quill';
import { loadContent, saveContent, createSuggestion, toDelta, toJSON } from '@/utils/deltaUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface DeltaEditorProps {
  scriptId: string;
  isAdmin: boolean;
}

export const DeltaEditor: React.FC<DeltaEditorProps> = ({ scriptId, isAdmin }) => {
  const [content, setContent] = useState<DeltaStatic | null>(null);
  const [originalContent, setOriginalContent] = useState<DeltaStatic | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const quillRef = useRef<ReactQuill>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Editor modules configuration
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'align'
  ];

  // Load user ID and initial content
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        setUserId(user?.id || null);
        
        // Load content
        const { contentDelta, hasDraft } = await loadContent(scriptId, user?.id || null);
        setContent(contentDelta);
        setOriginalContent(contentDelta);
        setHasDraft(hasDraft);
      } catch (error) {
        console.error('Error loading content:', error);
        toast.error('Failed to load content');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (scriptId) {
      loadInitialData();
    }
    
    return () => {
      // Clear auto-save timer on unmount
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [scriptId]);

  // Handle editor content change
  const handleChange = useCallback((value: string, delta: DeltaStatic, source: string, editor: any) => {
    if (source !== 'user') return;
    
    // Get the complete current content as a Delta
    const newContent = editor.getContents();
    setContent(newContent);
    
    // Set up auto-save timer
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    
    autoSaveTimerRef.current = window.setTimeout(() => {
      handleAutoSave(newContent);
    }, 3000); // Auto-save after 3 seconds of inactivity
  }, []);

  // Auto-save content
  const handleAutoSave = async (contentToSave: DeltaStatic) => {
    if (!scriptId || !userId) return;
    
    try {
      // Only auto-save as draft for non-admins
      if (!isAdmin) {
        await saveContent(scriptId, contentToSave, userId, false);
        setHasDraft(true);
      }
    } catch (error) {
      console.error('Error auto-saving content:', error);
    }
  };

  // Save changes (for admins) or submit suggestions (for non-admins)
  const handleSaveChanges = async () => {
    if (!scriptId || !userId || !content) return;
    
    setIsSaving(true);
    
    try {
      if (isAdmin) {
        // Admin: save changes directly
        const success = await saveContent(scriptId, content, userId, true);
        
        if (success) {
          toast.success('Changes saved successfully');
          // Update original content reference after saving
          setOriginalContent(content);
        } else {
          toast.error('Failed to save changes');
        }
      } else {
        // Non-admin: submit as suggestion
        if (!originalContent) return;
        
        const success = await createSuggestion(scriptId, originalContent, content, userId);
        
        if (success) {
          toast.success('Suggestion submitted successfully');
          // Reset content to original after submitting suggestion
          setContent(originalContent);
          setHasDraft(false);
        } else {
          toast.error('Failed to submit suggestion');
        }
      }
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('An error occurred while saving');
    } finally {
      setIsSaving(false);
    }
  };

  // Discard draft changes
  const handleDiscardChanges = () => {
    if (originalContent) {
      setContent(originalContent);
      setHasDraft(false);
      
      // Apply changes to editor
      const editor = quillRef.current?.getEditor();
      if (editor) {
        editor.setContents(originalContent);
      }
      
      // Delete draft from database
      if (userId) {
        supabase
          .from('script_drafts')
          .delete()
          .eq('script_id', scriptId)
          .eq('user_id', userId);
      }
      
      toast.info('Changes discarded');
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{isAdmin ? 'Edit Script' : 'Suggest Changes'}</CardTitle>
        <CardDescription>
          {isAdmin 
            ? 'Make changes directly to the script' 
            : 'Suggest changes for admin approval'}
          {hasDraft && !isAdmin && ' (Draft in progress)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="min-h-[400px] border rounded-md">
          <ReactQuill
            ref={quillRef}
            theme="snow"
            value={content || ''}
            onChange={handleChange}
            modules={modules}
            formats={formats}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        {hasDraft && !isAdmin && (
          <Button 
            variant="outline" 
            onClick={handleDiscardChanges}
            disabled={isSaving}
          >
            Discard Changes
          </Button>
        )}
        <div className="flex-1"></div>
        <Button 
          onClick={handleSaveChanges}
          disabled={isSaving}
        >
          {isAdmin ? 'Save Changes' : 'Submit Suggestion'}
        </Button>
      </CardFooter>
    </Card>
  );
};
