
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
import { isDeltaObject, logDelta } from '@/utils/editor';
import { combineDeltaContents } from '@/utils/editor/operations/deltaCombination';

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
  originalLines: any[]; // Array of line data from database
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

  // Initialize line data - pass originalLines
  const {
    lineData,
    setLineData,
    updateLineContents,
    loadDraftsForCurrentUser,
    isDataReady,
    initializeEditor,
  } = useLineData(scriptId, originalContent, userId, isAdmin, originalLines);

  // For debugging: log first few lines to see what we're working with
  useEffect(() => {
    if (originalLines && originalLines.length > 0) {
      console.log(`📋 TextEditor: Original lines sample (${originalLines.length} total):`);
      originalLines.slice(0, 2).forEach((line, idx) => {
        const contentType = typeof line.content;
        const contentPreview = contentType === 'string' 
          ? line.content.substring(0, 30) + '...' 
          : JSON.stringify(line.content).substring(0, 30) + '...';
          
        console.log(`  Line ${idx + 1}: content type=${contentType}, line_number=${line.line_number}, preview=${contentPreview}`);
      });
    }
  }, [originalLines]);

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

  // Process the original content from originalLines if needed
  useEffect(() => {
    if (editorInitialized && originalLines.length > 0 && !fullContentReadyRef.current && 
        (!content || (typeof content === 'string' && content.trim() === ''))) {
      console.log('📋 TextEditor: Content is empty but originalLines exists, updating editor content');
      
      try {
        // Extract Delta content from each line and combine them
        const deltaContents = originalLines.map(line => {
          if (typeof line.content === 'string' && line.content.includes('"ops"')) {
            try {
              // Attempt to parse JSON string to Delta object
              return JSON.parse(line.content);
            } catch (e) {
              console.error('📋 Error parsing Delta JSON:', e);
              return null;
            }
          } else if (typeof line.content === 'object' && line.content.ops) {
            // Already a Delta object
            return line.content;
          }
          return null;
        }).filter(Boolean); // Remove null entries
        
        if (deltaContents.length > 0) {
          console.log(`📋 TextEditor: Combining ${deltaContents.length} Delta objects`);
          
          // Use our utility to combine all Deltas into one
          const combinedDelta = combineDeltaContents(deltaContents);
          
          if (combinedDelta) {
            // Log the combined Delta for debugging
            logDelta(combinedDelta, '📋 Combined Delta');
            
            // Update the editor with the combined Delta
            updateEditorContent(combinedDelta);
            fullContentReadyRef.current = true;
            console.log('📋 TextEditor: Applied combined Delta to editor');
          } else {
            console.error('📋 TextEditor: Failed to combine Deltas');
          }
        } else {
          console.log('📋 TextEditor: No valid Delta objects found in originalLines');
        }
      } catch (error) {
        console.error('📋 TextEditor: Error processing originalLines:', error);
      }
    }
  }, [editorInitialized, originalLines, content, updateEditorContent]);

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
