
import React, { useEffect, useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { saveContent, saveSuggestion } from '@/utils/deltaUtils';
import { TextEditorActions } from '@/components/editor/TextEditorActions';
import { DeltaStatic } from 'quill';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useTextEditor } from '@/hooks/useTextEditor';
import { toDelta } from '@/utils/deltaUtils';

interface DeltaTextEditorProps {
  scriptId: string;
  isAdmin: boolean;
  onCommitToGithub?: (content: string) => Promise<boolean>;
  onSaveVersion?: (content: string) => void;
  onToggleSuggestions?: () => void;
  pendingSuggestionsCount?: number;
  hasPendingSuggestions?: boolean;
}

export const DeltaTextEditor: React.FC<DeltaTextEditorProps> = ({
  scriptId,
  isAdmin,
  onCommitToGithub,
  onSaveVersion,
  onToggleSuggestions,
  pendingSuggestionsCount = 0,
  hasPendingSuggestions = false
}) => {
  const [editorContent, setEditorContent] = useState<DeltaStatic | null>(null);
  const [currentFormat, setCurrentFormat] = useState<Record<string, any>>({});
  const quillRef = useRef<ReactQuill>(null);
  const { content, isLoading, userId } = useTextEditor(scriptId, isAdmin);
  const { submitEdits, submitAsSuggestion, isSaving } = useSubmitEdits({
    scriptId,
    isAdmin,
    userId
  });

  // Initialize editor with content
  useEffect(() => {
    if (!isLoading && content) {
      try {
        // Convert the content to a proper Delta object
        const delta = typeof content === 'string' 
          ? JSON.parse(content) 
          : content;
        
        setEditorContent(delta);
      } catch (e) {
        console.error('Failed to parse content:', e);
        setEditorContent({ ops: [{ insert: '\n' }] });
      }
    }
  }, [content, isLoading]);

  const handleChange = (content: any) => {
    // ReactQuill provides the content as a Delta object
    setEditorContent(content);
  };

  const handleChangeSelection = (range: any, source: string, editor: any) => {
    if (range) {
      setCurrentFormat(editor.getFormat(range));
    }
  };

  const handleFormat = (format: string, value: any) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.format(format, value);
    }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error('You must be logged in to save changes');
      return;
    }

    try {
      if (isAdmin && editorContent) {
        // Save content to database
        const success = await submitEdits(editorContent);
        
        if (success && onCommitToGithub) {
          // Also commit to GitHub if function is provided
          await onCommitToGithub(JSON.stringify(editorContent));
        }
      }
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleSaveDraft = async () => {
    if (!userId || isAdmin || !editorContent) return;
    
    try {
      // Save as draft for non-admin users
      await submitEdits(editorContent, { asDraft: true });
      toast.success('Draft saved successfully');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    }
  };

  const handleSubmitSuggestion = async () => {
    if (!userId || isAdmin || !editorContent) return;
    
    try {
      // Save suggestion
      const success = await saveSuggestion(scriptId, userId, editorContent);
      
      if (success) {
        toast.success('Suggestion submitted successfully');
        
        // Also save as draft
        handleSaveDraft();
      } else {
        toast.error('Failed to submit suggestion');
      }
    } catch (error) {
      console.error('Error submitting suggestion:', error);
      toast.error('Failed to submit suggestion');
    }
  };

  const handleSaveVersion = () => {
    if (!onSaveVersion || !editorContent) return;
    onSaveVersion(JSON.stringify(editorContent));
  };

  if (isLoading) {
    return <div>Loading editor...</div>;
  }

  return (
    <div className="flex flex-col border rounded-lg overflow-hidden">
      <TextEditorActions
        isAdmin={isAdmin}
        isSubmitting={isSaving}
        currentFormat={currentFormat}
        onFormat={handleFormat}
        onSubmit={handleSubmit}
        onSave={!isAdmin ? handleSaveDraft : undefined}
        onSaveVersion={isAdmin ? handleSaveVersion : undefined}
        onSubmitSuggestion={!isAdmin ? handleSubmitSuggestion : undefined}
        onToggleSuggestions={isAdmin ? onToggleSuggestions : undefined}
        pendingSuggestionsCount={pendingSuggestionsCount}
        hasPendingSuggestions={hasPendingSuggestions}
      />
      <ReactQuill
        ref={quillRef}
        theme="snow"
        value={editorContent || { ops: [{ insert: '\n' }] }}
        onChange={handleChange}
        onChangeSelection={handleChangeSelection}
        modules={{
          toolbar: false
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
          'color'
        ]}
      />
    </div>
  );
};
