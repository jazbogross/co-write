
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useLineData } from '@/hooks/useLineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { TextEditorActions } from './editor/TextEditorActions';
import { TextEditorContent } from './editor/TextEditorContent';
import { SuggestionsPanel } from './editor/SuggestionsPanel';

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  scriptId: string;
  onSuggestChange: (suggestion: string) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  scriptId,
  onSuggestChange,
}) => {
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Load user ID first
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  // Initialize line data and editor reference
  const { 
    lineData, 
    setLineData,
    updateLineContents, 
    loadDraftsForCurrentUser, 
    isDataReady,
    initializeEditor 
  } = useLineData(scriptId, "", userId);

  // Initialize text editor with quill reference
  const { 
    quillRef,
    content,
    setContent,
    lineCount,
    editorInitialized,
    handleChange,
    updateEditorContent,
    flushContentToLineData,
    formats,
    modules
  } = useTextEditor(
    "", 
    scriptId, 
    lineData,
    setLineData, 
    isDataReady, 
    initializeEditor,
    updateLineContents
  );

  // Setup draft loading
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

  useEffect(() => {
    if (userId && isDataReady && !draftLoadAttempted) {
      console.log('TextEditor: User ID available, loading drafts:', userId);
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, loadDraftsForCurrentUser, draftLoadAttempted]);

  // Apply loaded drafts to editor
  useEffect(() => {
    if (editorInitialized && draftLoadAttempted && lineData.length > 0 && !draftApplied) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        try {
          if (editor.lineTracking) {
            editor.lineTracking.setProgrammaticUpdate(true);
          }
          
          const hasDeltaContent = lineData.some(line => typeof line.content === 'object' && line.content.ops);
          
          if (hasDeltaContent) {
            const combinedDelta = {
              ops: lineData.flatMap(line => {
                if (typeof line.content === 'object' && line.content.ops) {
                  const ops = [...line.content.ops];
                  const lastOp = ops[ops.length - 1];
                  if (lastOp && typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')) {
                    ops.push({ insert: '\n' });
                  }
                  return ops;
                } else {
                  const content = typeof line.content === 'string' ? line.content : String(line.content);
                  return [{ insert: content }, { insert: '\n' }];
                }
              })
            };
            
            updateEditorContent(combinedDelta);
          } else {
            const combinedContent = lineData.map(line => line.content).join('\n');
            
            if (combinedContent !== content) {
              console.log('TextEditor: Updating editor content from loaded drafts');
              updateEditorContent(combinedContent);
            }
          }
          
          setDraftApplied(true);
        } finally {
          if (editor.lineTracking) {
            editor.lineTracking.setProgrammaticUpdate(false);
          }
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent]);

  // Handle content changes and submission
  const handleContentChange = (newContent: string) => {
    handleChange(newContent);
    
    if (editorInitialized) {
      setTimeout(() => flushContentToLineData(), 50);
    }
  };

  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    "",
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );
  
  // Format text handler and save handler
  const formatText = (format: string, value: any) => {
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    editor.format(format, value);
  };

  const handleSave = () => {
    flushContentToLineData();
    saveToSupabase();
  };

  if (!isDataReady) {
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  return (
    <>
      <TextEditorActions 
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={() => {
          flushContentToLineData();
          handleSubmit();
        }}
        onSave={handleSave}
      />
      
      <TextEditorContent
        content={content}
        lineCount={lineCount}
        quillRef={quillRef}
        modules={modules}
        formats={formats}
        onChange={handleContentChange}
      />

      {isAdmin && (
        <SuggestionsPanel
          isOpen={isSuggestionsOpen}
          scriptId={scriptId}
          onToggle={() => setIsSuggestionsOpen(!isSuggestionsOpen)}
        />
      )}
    </>
  );
};
