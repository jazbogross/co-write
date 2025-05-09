
import { useCallback, useState, useEffect } from 'react';
import ReactQuill from 'react-quill';
import { DeltaStatic } from 'quill';
import { Suggestion } from '@/components/suggestions/types';

export function useSuggestionsApplier(
  quillRef: React.RefObject<ReactQuill>,
  editorContent: DeltaStatic | null, 
  suggestions: Suggestion[]
) {
  const [lastChangeSource, setLastChangeSource] = useState<string | null>(null);
  
  // Function to mark a change as coming from the user
  const markAsUserChange = useCallback(() => {
    setLastChangeSource('user');
  }, []);
  
  // Apply suggestions to content but prevent infinite loops
  useEffect(() => {
    if (!quillRef.current || !editorContent || suggestions.length === 0) return;
    
    // Skip processing if the last change wasn't user-initiated
    if (lastChangeSource !== 'user' && lastChangeSource !== null) return;
    
    const editor = quillRef.current.getEditor();
    
    // Clear any existing suggestion formats first
    editor.formatText(0, editor.getLength(), {
      'suggestion-add': false,
      'suggestion-remove': false
    });
    
    // Apply each suggestion's formatting with a careful approach
    // to avoid reflow issues
    try {
      suggestions.forEach(suggestion => {
        if (suggestion.deltaDiff && suggestion.deltaDiff.ops) {
          let index = 0;
          
          suggestion.deltaDiff.ops.forEach(op => {
            if (op.retain) {
              index += op.retain;
            } else if (op.delete) {
              // For deletions, we need to highlight text that would be deleted
              editor.formatText(index, op.delete, {
                'suggestion-remove': { 
                  suggestionId: suggestion.id,
                  userId: suggestion.userId
                }
              });
            } else if (op.insert) {
              // Format inserted text as an addition suggestion
              const insertLength = typeof op.insert === 'string' ? op.insert.length : 1;
              
              editor.insertText(index, op.insert, {
                'suggestion-add': { 
                  suggestionId: suggestion.id,
                  userId: suggestion.userId
                }
              });
              
              index += insertLength;
            }
          });
        }
      });
      
      // Reset the change source to prevent further processing
      setLastChangeSource(null);
    } catch (error) {
      console.error('Error applying suggestions to editor:', error);
    }
  }, [suggestions, editorContent, lastChangeSource, quillRef]);
  
  return {
    markAsUserChange,
    lastChangeSource
  };
}
