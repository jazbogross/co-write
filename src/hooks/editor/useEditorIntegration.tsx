
import { useCallback, useRef } from 'react';
import ReactQuill from 'react-quill';
import { DeltaContent } from '@/utils/editor/types';
import { EDITOR_MODULES } from '@/components/editor/LineTrackingModule';

interface EditorIntegrationProps {
  editorInitialized: boolean;
  content: string | DeltaContent;
  setContent: (content: string | DeltaContent) => void;
  flushContentToLineData: () => void;
}

export const useEditorIntegration = ({
  editorInitialized,
  content,
  setContent,
  flushContentToLineData
}: EditorIntegrationProps) => {
  console.log('🔄 useEditorIntegration: Hook initialized');
  
  // Create quill reference
  const quillRef = useRef<ReactQuill>(null);
  
  // Define editor formats and modules
  const formats = ['bold', 'italic', 'align'];
  const modules = EDITOR_MODULES;
  
  // Flush content when needed (e.g., before saving)
  const flushContent = useCallback(() => {
    console.log('🔄 useEditorIntegration: Flushing content');
    if (editorInitialized) {
      flushContentToLineData();
    } else {
      console.log('🔄 useEditorIntegration: Editor not initialized, skipping flush');
    }
  }, [editorInitialized, flushContentToLineData]);
  
  return {
    quillRef,
    formats,
    modules,
    flushContent
  };
};
