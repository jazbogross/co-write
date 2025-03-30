
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
      
      // Create suggestion-add format
      class SuggestionAddFormat extends Inline {
        static create() {
          const node = super.create();
          node.setAttribute('class', 'ql-suggestion-add');
          return node;
        }
      }
      SuggestionAddFormat.blotName = 'suggestion-add';
      SuggestionAddFormat.tagName = 'span';
      
      // Create suggestion-remove format
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
