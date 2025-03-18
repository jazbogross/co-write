
import React, { useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { DeltaStatic } from 'quill';
import Delta from 'quill-delta';
import { registerSuggestionFormats } from '@/utils/editor/formats/SuggestionFormat';
import { SuggestionFormatter } from '@/utils/editor/formats/SuggestionFormatter';
import { analyzeDeltaDifferences } from '@/utils/diff/contentDiff';
import { extractPlainTextFromDelta } from '@/utils/editor';
import { safeToDelta } from '@/utils/delta/safeDeltaOperations';

interface DiffEditorProps {
  originalContent: DeltaStatic | string;
  suggestedContent: DeltaStatic | string;
  readOnly?: boolean;
}

export const DiffEditor: React.FC<DiffEditorProps> = ({
  originalContent,
  suggestedContent,
  readOnly = true
}) => {
  const quillRef = useRef<ReactQuill>(null);
  
  useEffect(() => {
    if (!quillRef.current) return;
    
    // Register custom formats for suggestions
    const Quill = ReactQuill.Quill;
    registerSuggestionFormats(Quill);
    
    // Extract plain text from content
    const originalText = typeof originalContent === 'string' 
      ? originalContent 
      : extractPlainTextFromDelta(originalContent);
      
    const suggestedText = typeof suggestedContent === 'string'
      ? suggestedContent
      : extractPlainTextFromDelta(suggestedContent);
    
    // Analyze differences
    const { changes } = analyzeDeltaDifferences(originalText, suggestedText);
    
    // Create a delta with diff formatting
    const diffDelta = SuggestionFormatter.createComparisonDelta(
      originalText,
      suggestedText,
      changes
    );
    
    // Convert to DeltaStatic before setting contents
    const deltaStatic = safeToDelta(diffDelta);
    
    // Set the content with diff formatting
    const editor = quillRef.current.getEditor();
    editor.setContents(deltaStatic);
  }, [originalContent, suggestedContent]);
  
  const modules = {
    toolbar: false // Disable toolbar for diff view
  };
  
  return (
    <div className="quill-diff-editor">
      <ReactQuill
        ref={quillRef}
        readOnly={readOnly}
        theme="snow"
        modules={modules}
      />
    </div>
  );
};
