
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useLineData } from '@/hooks/useLineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { TextEditorActions } from './editor/TextEditorActions';
import { TextEditorContent } from './editor/TextEditorContent';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { LineTrackingModule } from './editor/LineTracker'; // Import the module
import ReactQuill from 'react-quill';
import { isDeltaObject } from '@/utils/editor';

// Register the module before you use it
ReactQuill.Quill.register('modules/lineTracking', LineTrackingModule);

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
  console.log('📋 TextEditor initializing with scriptId:', scriptId);
  
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Load user ID first
  useEffect(() => {
    console.log('📋 TextEditor: Fetching user...');
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('📋 TextEditor: User fetched:', user?.id);
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

  // Log when lineData changes
  useEffect(() => {
    console.log(`📋 TextEditor: lineData updated:`, lineData.length > 0 ? 
      `${lineData.length} lines` :
      `[]`);
    
    if (lineData.length > 0) {
      // Log first few and last few lines
      console.log('📋 First line:', JSON.stringify(lineData[0]).substring(0, 100) + '...');
      if (lineData.length > 1) {
        console.log('📋 Second line:', JSON.stringify(lineData[1]).substring(0, 100) + '...');
      }
      if (lineData.length > 2) {
        console.log('📋 Last line:', JSON.stringify(lineData[lineData.length-1]).substring(0, 100) + '...');
      }
    }
  }, [lineData]);

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
  
  // Log when content changes
  useEffect(() => {
    console.log('📋 TextEditor: Content changed.');
    console.log('📋 Content type:', typeof content, isDeltaObject(content) ? 'isDelta' : 'notDelta');
    if (typeof content === 'string') {
      console.log('📋 Content preview:', content.substring(0, 100) + '...');
    } else {
      console.log('📋 Content structure:', JSON.stringify(content).substring(0, 100) + '...');
    }
  }, [content]);

  // Log when lineCount changes
  useEffect(() => {
    console.log(`📋 TextEditor: Updated line count: ${lineCount}`);
  }, [lineCount]);

  // Log when editorInitialized changes
  useEffect(() => {
    console.log(`📋 TextEditor: Editor initialized: ${editorInitialized}`);
    if (editorInitialized) {
      const editor = quillRef.current?.getEditor();
      if (editor) {
        const lines = editor.getLines(0);
        console.log(`📋 TextEditor: Initial line count from editor: ${lines.length}`);
        
        // Log DOM structure
        console.log('📋 TextEditor: Initializing line UUIDs in the DOM...');
        setTimeout(() => {
          const editorElement = document.querySelector('.ql-editor');
          if (editorElement) {
            const paragraphs = editorElement.querySelectorAll('p');
            console.log(`📋 TextEditor: Found ${paragraphs.length} <p> elements`);
            
            // Log UUIDs of first few paragraphs
            Array.from(paragraphs).slice(0, 3).forEach((p, i) => {
              console.log(`📋 Paragraph ${i+1} UUID:`, p.getAttribute('data-line-uuid'));
            });
          }
          console.log('📋 TextEditor: Line UUIDs initialized.');
        }, 500);
      }
    }
  }, [editorInitialized, quillRef]);

  // Setup draft loading
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const [draftApplied, setDraftApplied] = useState(false);

  useEffect(() => {
    if (userId && isDataReady && !draftLoadAttempted) {
      console.log('📋 TextEditor: User ID available, loading drafts:', userId);
      loadDraftsForCurrentUser();
      setDraftLoadAttempted(true);
    }
  }, [userId, isDataReady, loadDraftsForCurrentUser, draftLoadAttempted]);

  // Apply loaded drafts to editor
  useEffect(() => {
    if (editorInitialized && draftLoadAttempted && lineData.length > 0 && !draftApplied) {
      console.log('📋 TextEditor: Applying drafts to editor. LineData length:', lineData.length);
      const editor = quillRef.current?.getEditor();
      if (editor) {
        try {
          if (editor.lineTracking) {
            console.log('📋 TextEditor: Setting programmatic update mode ON');
            editor.lineTracking.setProgrammaticUpdate(true);
          }
          
          const hasDeltaContent = lineData.some(line => isDeltaObject(line.content));
          console.log('📋 TextEditor: Has Delta content:', hasDeltaContent);
          
          if (hasDeltaContent) {
            console.log('📋 TextEditor: Creating combined Delta from line data');
            const combinedDelta = {
              ops: lineData.flatMap(line => {
                if (isDeltaObject(line.content)) {
                  console.log(`📋 Line ${line.lineNumber} is a Delta`);
                  const ops = [...line.content.ops];
                  const lastOp = ops[ops.length - 1];
                  if (lastOp && typeof lastOp.insert === 'string' && !lastOp.insert.endsWith('\n')) {
                    ops.push({ insert: '\n' });
                  }
                  return ops;
                } else {
                  console.log(`📋 Line ${line.lineNumber} is plain text`);
                  const content = typeof line.content === 'string' ? line.content : String(line.content);
                  return [{ insert: content }, { insert: '\n' }];
                }
              })
            };
            
            console.log('📋 TextEditor: Final Delta ops count:', combinedDelta.ops.length);
            console.log('📋 TextEditor: First few ops:', JSON.stringify(combinedDelta.ops.slice(0, 2)));
            updateEditorContent(combinedDelta);
          } else {
            console.log('📋 TextEditor: Creating combined content from strings');
            const combinedContent = lineData.map(line => line.content).join('\n');
            
            if (combinedContent !== content) {
              console.log('📋 TextEditor: Updating editor content from loaded drafts');
              updateEditorContent(combinedContent);
            } else {
              console.log('📋 TextEditor: Content unchanged, skipping update');
            }
          }
          
          setDraftApplied(true);
          console.log('📋 TextEditor: Draft application complete');
        } finally {
          if (editor.lineTracking) {
            console.log('📋 TextEditor: Setting programmatic update mode OFF');
            editor.lineTracking.setProgrammaticUpdate(false);
          }
        }
      }
    }
  }, [lineData, editorInitialized, draftLoadAttempted, quillRef, content, updateEditorContent]);

  // Handle content changes and submission
  const handleContentChange = (newContent: string) => {
    console.log('📋 TextEditor: handleContentChange called');
    console.log('📋 TextEditor: Content preview:', newContent.substring(0, 100) + '...');
    
    handleChange(newContent);
    
    if (editorInitialized) {
      console.log('📋 TextEditor: Flushing content to line data');
      setTimeout(() => {
        console.log('📋 TextEditor: Running delayed flush content');
        flushContentToLineData();
        
        // Log current line contents after flush
        const editor = quillRef.current?.getEditor();
        if (editor) {
          const lines = editor.getLines(0);
          console.log(`📋 TextEditor: Current line count: ${lines.length}`);
          
          // Sample first few lines
          const lineContents = lines.slice(0, 3).map(line => {
            const lineIndex = editor.getIndex(line);
            const nextLineIndex = line.next ? editor.getIndex(line.next) : editor.getLength();
            const delta = editor.getContents(lineIndex, nextLineIndex - lineIndex);
            return JSON.stringify(delta).substring(0, 50) + '...';
          });
          
          console.log(`📋 TextEditor: Current line contents sample:`, lineContents);
        }
      }, 50);
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
    console.log(`📋 TextEditor: Formatting text with ${format}:`, value);
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    editor.format(format, value);
  };

  const handleSave = () => {
    console.log('📋 TextEditor: handleSave called');
    flushContentToLineData();
    console.log('📋 TextEditor: Content flushed, saving to Supabase');
    saveToSupabase();
  };

  if (!isDataReady) {
    console.log('📋 TextEditor: Data not ready, showing loading');
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  console.log('📋 TextEditor: Rendering editor with ready data');
  return (
    <>
      <TextEditorActions 
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={() => {
          console.log('📋 TextEditor: Submit button clicked');
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
