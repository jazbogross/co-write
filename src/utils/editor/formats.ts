
/**
 * Formats for Quill editor related to displaying suggestions
 */

/**
 * Register suggestion format with Quill
 */
export const registerSuggestionFormats = (Quill: any): boolean => {
  try {
    // Register suggestion formats with Quill
    const Inline = Quill.import('blots/inline');
    
    // Create suggestion-add format for added content
    class SuggestionAddFormat extends Inline {
      static create() {
        const node = super.create();
        node.setAttribute('class', 'ql-suggestion-add');
        return node;
      }
    }
    SuggestionAddFormat.blotName = 'suggestion-add';
    SuggestionAddFormat.tagName = 'span';
    
    // Create suggestion-remove format for removed content
    class SuggestionRemoveFormat extends Inline {
      static create() {
        const node = super.create();
        node.setAttribute('class', 'ql-suggestion-remove');
        return node;
      }
    }
    SuggestionRemoveFormat.blotName = 'suggestion-remove';
    SuggestionRemoveFormat.tagName = 'span';
    
    // Register formats with Quill
    Quill.register(SuggestionAddFormat);
    Quill.register(SuggestionRemoveFormat);
    
    return true;
  } catch (error) {
    console.error('Error registering suggestion formats:', error);
    return false;
  }
};

/**
 * CSS for styling suggestion formats in Quill
 */
export const suggestionFormatCSS = `
.ql-suggestion-add {
  background-color: rgba(0, 255, 0, 0.2);
}
.ql-suggestion-remove {
  background-color: rgba(255, 0, 0, 0.2);
  text-decoration: line-through;
}
`;
