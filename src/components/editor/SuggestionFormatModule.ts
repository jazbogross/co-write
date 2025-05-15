
/**
 * SuggestionFormatModule - Registers suggestion formats with Quill
 */

// Simple module to register suggestion formatting in Quill
export const SuggestionFormatModule = {
  name: 'suggestionFormat',
  register: function (Quill: any) {
    try {
      // Avoid double registration
      if (Quill._suggestionFormatModuleRegistered) {
        return;
      }
      
      // Register suggestion formats with Quill
      const Inline = Quill.import('blots/inline');
      
      // Create suggestion-add format with metadata
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
      
      // Create suggestion-remove format with metadata
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
      
      // Register formats with Quill
      Quill.register(SuggestionAddFormat);
      Quill.register(SuggestionRemoveFormat);
      
      // Mark as registered to avoid double registration
      Quill._suggestionFormatModuleRegistered = true;
      
      console.log('SuggestionFormat module initialized');
      return true;
    } catch (error) {
      console.error('Error registering suggestion formats:', error);
      return false;
    }
  }
};

// CSS for suggestion formats - can be used by other components
export const suggestionFormatCSS = `
.ql-suggestion-add {
  background-color: rgba(0, 128, 0, 0.2);
  color: darkgreen;
}

.ql-suggestion-remove {
  background-color: rgba(255, 0, 0, 0.2);
  color: darkred;
  text-decoration: line-through;
}
`;
