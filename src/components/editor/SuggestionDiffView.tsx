
import React, { useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import { SuggestionFormatter } from '@/utils/editor/formats';
import { DiffChange } from '@/utils/diff';
import { initializeSuggestionFormats } from './SuggestionFormatModule';
import { DeltaContent } from '@/utils/editor/types';
import 'react-quill/dist/quill.bubble.css';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges
}) => {
  const quillRef = useRef<ReactQuill>(null);
  const initializedRef = useRef(false);
  
  // Create the comparison delta once
  const comparisonDelta = SuggestionFormatter.createComparisonDelta(
    originalContent,
    suggestedContent,
    diffChanges
  );
  
  // Initialize formats when component mounts
  useEffect(() => {
    if (!initializedRef.current) {
      initializeSuggestionFormats(ReactQuill.Quill);
      initializedRef.current = true;
    }
    
    // Set the editor content
    if (quillRef.current) {
      const editor = quillRef.current.getEditor();
      // Convert our DeltaContent to Quill's Delta type using a direct cast
      // In a production environment, we would implement a proper adapter
      editor.setContents(comparisonDelta as any);
      editor.disable(); // Make it read-only
    }
  }, []);
  
  return (
    <div className="suggestion-diff-view border rounded p-2 bg-gray-50">
      <ReactQuill
        ref={quillRef}
        readOnly={true}
        theme="bubble"
        modules={{ toolbar: false }}
      />
    </div>
  );
};
