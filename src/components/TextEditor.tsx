
import React, { useEffect, useState, useCallback, useRef } from 'react';
import ReactQuill from 'react-quill';
import { useTextEditor } from '@/hooks/useTextEditor';
import { useLineData } from '@/hooks/lineData';
import { useSubmitEdits } from '@/hooks/useSubmitEdits';
import { useDraftLoader } from '@/hooks/useDraftLoader';
import { useUserData } from '@/hooks/useUserData';
import { useEditorLogger } from '@/hooks/useEditorLogger';
import { useEditorOperations } from '@/components/editor/TextEditorOperations';
import { TextEditorActions } from './editor/TextEditorActions';
import { TextEditorContent } from './editor/TextEditorContent';
import { SuggestionsPanel } from './editor/SuggestionsPanel';
import { LineTrackingModule } from './editor/LineTrackingModule';
import { SuggestionFormatModule } from './editor/SuggestionFormatModule';
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject } from '@/utils/editor';

// Quill's default Snow theme CSS
import 'react-quill/dist/quill.snow.css';

// --- Register modules just once ---
// Register SuggestionFormatModule first - make sure it happens before the LineTrackingModule
try {
  // Try to register SuggestionFormatModule first
  SuggestionFormatModule.register(ReactQuill.Quill);
  // Then register LineTrackingModule
  LineTrackingModule.register(ReactQuill.Quill);
  console.log('📝 All Quill modules registered successfully');
} catch (error) {
  console.error('📝 Error registering Quill modules:', error);
}

interface TextEditorProps {
  isAdmin: boolean;
  originalContent: string;
  originalLines: any[]; // Add this new prop
  scriptId: string;
  onSuggestChange: (suggestion: string | DeltaContent) => void;
}

export const TextEditor: React.FC<TextEditorProps> = ({
  isAdmin,
  originalContent,
  originalLines,
  scriptId,
  onSuggestChange,
}) => {
  console.log('📋 TextEditor: Initializing with scriptId:', scriptId, 'isAdmin:', isAdmin, 
    'originalContent length:', originalContent?.length || 0,
    'originalLines count:', originalLines?.length || 0);

  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const [draftLoadAttempted, setDraftLoadAttempted] = useState(false);
  const initializedRef = useRef(false);
  const fullContentReadyRef = useRef(false);

  // Get user data
  const { userId } = useUserData();

  // Initialize line data - pass originalLines instead of using originalContent
  const {
    lineData,
    setLineData,
    updateLineContents,
    loadDraftsForCurrentUser,
    isDataReady,
    initializeEditor,
  } = useLineData(scriptId, originalContent, userId, isAdmin, originalLines);

  // Initialize text editor
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
    modules,
  } = useTextEditor(
    originalContent,
    scriptId,
    lineData,
    setLineData,
    isDataReady,
    initializeEditor,
    updateLineContents
  );

  // Set up logging
  useEditorLogger(lineData, content, lineCount, editorInitialized, quillRef);

  // Editor operations (format, save, etc.)
  const { handleContentChange, formatText, handleSave } = useEditorOperations({
    quillRef,
    editorInitialized,
    handleChange,
    flushContentToLineData,
  });

  // Draft loader - with isAdmin parameter
  const { draftApplied } = useDraftLoader({
    editorInitialized,
    draftLoadAttempted,
    lineData,
    quillRef,
    content,
    updateEditorContent,
    isAdmin,
  });

  // Attempt draft load once editor is initialized and data is ready
  useEffect(() => {
    if (editorInitialized && isDataReady && userId && !draftLoadAttempted && !initializedRef.current) {
      console.log('📋 TextEditor: Editor initialized and data ready, loading drafts for user:', userId, 'isAdmin:', isAdmin);
      initializedRef.current = true;
      setDraftLoadAttempted(true);
      loadDraftsForCurrentUser();
    }
  }, [editorInitialized, isDataReady, userId, draftLoadAttempted, loadDraftsForCurrentUser, isAdmin]);

  // Add a check for content being empty but lineData having content
  useEffect(() => {
    if (editorInitialized && lineData.length > 0 && !fullContentReadyRef.current && 
        (!content || (typeof content === 'string' && content.trim() === ''))) {
      console.log('📋 TextEditor: Content is empty but lineData exists, updating editor content');
      
      // Force content update from lineData
      const editor = quillRef.current?.getEditor();
      if (editor) {
        // Attempt to get Delta content from lineData
        const hasDeltas = lineData.some(line => isDeltaObject(line.content));
        console.log('📋 TextEditor: LineData has Delta objects:', hasDeltas);
        
        if (hasDeltas) {
          // Fix: Don't pass array to updateEditorContent, instead combine contents or use first line
          // Use first line content or first Delta as a starting point
          const deltaContent = lineData.find(line => isDeltaObject(line.content))?.content;
          if (deltaContent) {
            updateEditorContent(deltaContent);
          } else {
            // Fallback to plain text approach with first line
            const firstLineContent = lineData[0]?.content || '';
            updateEditorContent(typeof firstLineContent === 'string' ? firstLineContent : JSON.stringify(firstLineContent));
          }
        } else {
          // Use plain text approach with first line or concatenated text
          const plainText = lineData[0]?.content || '';
          updateEditorContent(typeof plainText === 'string' ? plainText : JSON.stringify(plainText));
        }
        
        fullContentReadyRef.current = true;
      }
    }
  }, [editorInitialized, lineData, content, updateEditorContent, quillRef]);

  // Submissions
  const { isSubmitting, handleSubmit, saveToSupabase } = useSubmitEdits(
    isAdmin,
    scriptId,
    originalContent,
    content,
    lineData,
    userId,
    onSuggestChange,
    loadDraftsForCurrentUser,
    quillRef.current?.getEditor()
  );

  // Save & sync
  const handleSaveAndSync = useCallback(() => {
    console.log('📋 TextEditor: Save button clicked');
    handleSave();
    saveToSupabase();
  }, [handleSave, saveToSupabase]);

  // Submit changes
  const handleSubmitChanges = useCallback(() => {
    console.log('📋 TextEditor: Submit button clicked');
    flushContentToLineData();
    handleSubmit();
  }, [flushContentToLineData, handleSubmit]);

  // Show loading if data not ready
  if (!isDataReady) {
    console.log('📋 TextEditor: Data not ready, showing loading');
    return <div className="flex items-center justify-center p-8">Loading editor data...</div>;
  }

  console.log('📋 TextEditor: Rendering editor with ready data');
  console.log('📋 TextEditor: Content type:', typeof content, isDeltaObject(content) ? 'isDelta' : 'notDelta');
  console.log('📋 TextEditor: Line count:', lineCount, 'lineData length:', lineData.length);
  
  return (
    <>
      <TextEditorActions
        isAdmin={isAdmin}
        isSubmitting={isSubmitting}
        onFormat={formatText}
        onSubmit={handleSubmitChanges}
        onSave={handleSaveAndSync}
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
