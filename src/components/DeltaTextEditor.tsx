
import React, { useEffect, useState, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
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
        const delta = toDelta(content);
        setEditorContent(delta);
      } catch (e) {
        console.error('Failed to parse content:', e);
        setEditorContent(toDelta({ ops: [{ insert: '\n' }] }));
      }
    }
  }, [content, isLoading]);

  const handleChange = (value: string, delta: DeltaStatic, source: string, editor: any) => {
    if (editor && editor.getContents) {
      // Get the actual Delta object from the editor
      const contentDelta = editor.getContents();
      setEditorContent(contentDelta);
    }
  };

  const handleChangeSelection = (range: any, source: string, editor: any) => {
    if (range && editor && typeof editor.getFormat === 'function') {
      try {
        setCurrentFormat(editor.getFormat(range));
      } catch (error) {
        console.error('Error getting format:', error);
        setCurrentFormat({});
      }
    }
  };

  const handleFormat = (format: string, value: any) => {
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      editor.format(format, value);
      
      // Immediately update the toolbar state based on current selection
      const selection = editor.getSelection();
      if (selection) {
        setCurrentFormat(editor.getFormat(selection));
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
        // Get the Delta object directly from the editor
        const delta = quillRef.current.getEditor().getContents();
        
        // Save content to database
        const success = await submitEdits(delta);
        
        if (success && onCommitToGithub) {
          // Also commit to GitHub if function is provided
          // Convert Delta to string for GitHub storage
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
      // Get the Delta object directly from the editor
      const delta = quillRef.current.getEditor().getContents();
      
      // Save as draft for non-admin users
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
      // Get the Delta object directly from the editor
      const delta = quillRef.current.getEditor().getContents();
      
      // Create a lineData object with the current editor content
      const lineData = [{
        uuid: scriptId,
        lineNumber: 1,
        content: delta,
        originalAuthor: userId,
        editedBy: [],
        hasDraft: false
      }];
      
      // Get original content to compare with
      const { data } = await supabase
        .from('scripts')
        .select('content')
        .eq('id', scriptId)
        .single();
        
      const originalContent = data?.content || { ops: [{ insert: '\n' }] };
      
      // Submit the suggestion
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

  const handleSaveVersion = () => {
    if (!onSaveVersion || !quillRef.current) return;
    
    // Get the Delta object directly from the editor
    const delta = quillRef.current.getEditor().getContents();
    
    // Convert to JSON string for version storage
    onSaveVersion(JSON.stringify(delta));
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
        value={editorContent || toDelta({ ops: [{ insert: '\n' }] })}
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
