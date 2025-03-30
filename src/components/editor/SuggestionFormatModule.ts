
/**
 * SuggestionFormatModule - Registers suggestion formats with Quill
 */

// Simple module to register suggestion formatting in Quill
export const SuggestionFormatModule = {
  name: 'suggestionFormat',
  register: function (Quill: any) {
    try {
      if ((Quill as any)._suggestionFormatModuleRegistered) {
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
      SuggestionAddFormat.blotName = 'suggestion-add';
      SuggestionAddFormat.tagName = 'span';
      
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
      SuggestionRemoveFormat.blotName = 'suggestion-remove';
      SuggestionRemoveFormat.tagName = 'span';
      
      // Register formats with Quill
      Quill.register(SuggestionAddFormat);
      Quill.register(SuggestionRemoveFormat);
      
      // Register the module
      Quill.register('modules/suggestionFormat', function() {
        return { initialized: true };
      });
      
      // Mark as registered
      (Quill as any)._suggestionFormatModuleRegistered = true;
      
      return true;
    } catch (error) {
      console.error('Error registering suggestion formats:', error);
      return false;
    }
  }
};
