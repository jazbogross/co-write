
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
      static create(value: any) {
        const node = super.create();
        node.setAttribute('class', 'ql-suggestion-add');
        
        // Store metadata if provided
        if (value && typeof value === 'object') {
          if (value.suggestionId) {
            node.setAttribute('data-suggestion-id', value.suggestionId);
          }
          if (value.userId) {
            node.setAttribute('data-user-id', value.userId);
          }
        }
        
        return node;
      }
      
      static formats(node: HTMLElement) {
        const suggestionId = node.getAttribute('data-suggestion-id');
        const userId = node.getAttribute('data-user-id');
        
        if (suggestionId || userId) {
          return {
            suggestionId,
            userId
          };
        }
        return undefined;
      }
    }
    SuggestionAddFormat.blotName = 'suggestion-add';
    SuggestionAddFormat.tagName = 'span';
    
    // Create suggestion-remove format for removed content
    class SuggestionRemoveFormat extends Inline {
      static create(value: any) {
        const node = super.create();
        node.setAttribute('class', 'ql-suggestion-remove');
        
        // Store metadata if provided
        if (value && typeof value === 'object') {
          if (value.suggestionId) {
            node.setAttribute('data-suggestion-id', value.suggestionId);
          }
          if (value.userId) {
            node.setAttribute('data-user-id', value.userId);
          }
        }
        
        return node;
      }
      
      static formats(node: HTMLElement) {
        const suggestionId = node.getAttribute('data-suggestion-id');
        const userId = node.getAttribute('data-user-id');
        
        if (suggestionId || userId) {
          return {
            suggestionId,
            userId
          };
        }
        return undefined;
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
 * Added GoogleDocs-like styles for suggestions
 */
export const suggestionFormatCSS = `
.ql-suggestion-add {
  background-color: rgba(0, 100, 0, 0.15);
  color: darkgreen;
  cursor: pointer;
  position: relative;
}

.ql-suggestion-add:hover {
  background-color: rgba(0, 100, 0, 0.25);
}

.ql-suggestion-remove {
  color: darkred;
  text-decoration: line-through;
  background-color: rgba(255, 0, 0, 0.1);
  cursor: pointer;
  position: relative;
}

.ql-suggestion-remove:hover {
  background-color: rgba(255, 0, 0, 0.2);
}

/* Popup styling will be handled by Popover component */
`;
