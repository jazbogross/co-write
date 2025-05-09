
import { useCallback } from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from 'quill';
import { Suggestion } from '@/components/suggestions/types';

interface UseEditorEventHandlersProps {
  quillRef: React.RefObject<ReactQuill>;
  setEditorContent: React.Dispatch<React.SetStateAction<DeltaStatic | null>>;
  markAsUserChange: () => void;
  isAdmin: boolean;
  suggestions: Suggestion[];
  openSuggestionPopover: (suggestion: Suggestion, position: {x: number, y: number}) => void;
}

export function useEditorEventHandlers({
  quillRef,
  setEditorContent,
  markAsUserChange,
  isAdmin,
  suggestions,
  openSuggestionPopover
}: UseEditorEventHandlersProps) {
  // Handle content changes
  const handleChange = useCallback((value: string, delta: any, source: string, editor: any) => {
    // Always update content on user changes
    if (source === 'user') {
      markAsUserChange();
      
      // Capture current content from editor
      if (editor && editor.getContents) {
        const contentDelta = editor.getContents();
        setEditorContent(contentDelta);
      }
    }
  }, [markAsUserChange, setEditorContent]);

  // Handle editor clicks for suggestions
  const handleEditorClick = useCallback((event: React.MouseEvent) => {
    if (!quillRef.current || !isAdmin) return;
    
    const editor = quillRef.current.getEditor();
    const editorBounds = editor.root.getBoundingClientRect();
    
    // Check if clicked element has suggestion class
    const element = event.target as HTMLElement;
    const isSuggestionAdd = element.classList.contains('ql-suggestion-add');
    const isSuggestionRemove = element.classList.contains('ql-suggestion-remove');
    
    if ((isSuggestionAdd || isSuggestionRemove) && isAdmin) {
      const suggestionId = element.getAttribute('data-suggestion-id');
      
      if (suggestionId) {
        const suggestion = suggestions.find(s => s.id === suggestionId);
        
        if (suggestion) {
          // Position popover next to the clicked element
          openSuggestionPopover(
            suggestion, 
            {
              x: event.clientX - editorBounds.left + editorBounds.width / 2,
              y: event.clientY - editorBounds.top
            }
          );
          event.preventDefault();
          event.stopPropagation();
        }
      }
    }
  }, [quillRef, isAdmin, suggestions, openSuggestionPopover]);
  
  return {
    handleChange,
    handleEditorClick
  };
}
