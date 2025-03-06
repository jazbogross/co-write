
/**
 * SuggestionFormat.ts - Custom Quill formats for displaying suggestions
 */
import Quill from 'quill';

// We'll use these classes for styling suggestions
const FORMATS = {
  ADDITION: 'suggestion-addition',
  DELETION: 'suggestion-deletion',
  MODIFIED: 'suggestion-modified'
};

// Create custom formats for Quill
export function registerSuggestionFormats(QuillInstance: typeof Quill) {
  // Register format for additions (new content)
  const AdditionFormat = QuillInstance.import('formats/inline');
  class SuggestionAddition extends AdditionFormat {
    static blotName = 'suggestion-addition';
    static tagName = 'span';
    static className = FORMATS.ADDITION;
  }
  
  // Register format for deletions (removed content)
  const DeletionFormat = QuillInstance.import('formats/inline');
  class SuggestionDeletion extends DeletionFormat {
    static blotName = 'suggestion-deletion';
    static tagName = 'span';
    static className = FORMATS.DELETION;
  }
  
  // Register format for modified content
  const ModifiedFormat = QuillInstance.import('formats/inline');
  class SuggestionModified extends ModifiedFormat {
    static blotName = 'suggestion-modified';
    static tagName = 'span';
    static className = FORMATS.MODIFIED;
  }
  
  // Register the new formats with Quill
  QuillInstance.register(SuggestionAddition, true);
  QuillInstance.register(SuggestionDeletion, true);
  QuillInstance.register(SuggestionModified, true);
  
  console.log('📝 Suggestion formats registered with Quill');
  
  return {
    FORMATS,
    SuggestionAddition,
    SuggestionDeletion,
    SuggestionModified
  };
}

// CSS classes to be added to the document
export const suggestionFormatCSS = `
.${FORMATS.ADDITION} {
  background-color: rgba(0, 128, 0, 0.15);
  color: #006400;
  text-decoration: none;
  padding: 0 2px;
  border-radius: 2px;
}

.${FORMATS.DELETION} {
  background-color: rgba(255, 0, 0, 0.15);
  color: #8B0000;
  text-decoration: line-through;
  padding: 0 2px;
  border-radius: 2px;
}

.${FORMATS.MODIFIED} {
  background-color: rgba(255, 165, 0, 0.15);
  color: #8B4500;
  padding: 0 2px;
  border-radius: 2px;
}
`;
