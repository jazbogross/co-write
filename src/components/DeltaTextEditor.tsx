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
import Delta from 'quill-delta';

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
      } catch (error) {
        console.error('Error getting format:', error);
        setCurrentFormat({});
      }
    } else {
      setCurrentFormat({});
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

  const handleAcceptSuggestion = async (suggestionId: string, deltaDiff: DeltaStatic) => {
    if (!userId) {
      toast.error('You must be logged in to accept suggestions');
      return;
    }

    try {
      if (isAdmin && editorContent) {
        const originalDelta = new Delta(editorContent.ops || []);
        const diffDelta = new Delta(deltaDiff.ops || []);
        
        const newContent = originalDelta.compose(diffDelta);
        
        setEditorContent(newContent as unknown as DeltaStatic);
        
        const success = await submitEdits(newContent as unknown as DeltaStatic);
        
        if (success && onCommitToGithub) {
          await onCommitToGithub(JSON.stringify(newContent));
        }
        
        toast.success('Suggestion applied successfully');
      }
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      toast.error('Failed to apply suggestion');
    }
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
          'color',
          'align',
          'direction'
        ]}
      />
    </div>
  );
};
