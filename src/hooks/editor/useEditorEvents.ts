
import { useCallback } from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from 'quill';
import { Suggestion } from '@/components/suggestions/types';

export const useEditorEvents = (
  quillRef: React.RefObject<ReactQuill>,
  suggestions: Suggestion[],
  isAdmin: boolean,
  openSuggestionPopover: (suggestion: Suggestion, position: {x: number, y: number}) => void,
  setEditorContent: React.Dispatch<React.SetStateAction<DeltaStatic | null>>
) => {
  const handleChange = useCallback((_value: string, _delta: DeltaStatic, _source: string, editor: any) => {
    if (editor && editor.getContents) {
      const contentDelta = editor.getContents();
      setEditorContent(contentDelta);
    }
  }, [setEditorContent]);

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
};
