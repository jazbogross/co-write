
/**
 * SuggestionFormatModule.ts - Quill module for suggestion formatting
 */
import ReactQuill from 'react-quill';
import { registerSuggestionFormats, suggestionFormatCSS } from '@/utils/editor/formats';

/**
 * Register suggestion formats with Quill and initialize CSS
 */
export const initializeSuggestionFormats = (Quill: typeof ReactQuill.Quill): void => {
  try {
    // Register formats with Quill
    const formatResult = registerSuggestionFormats(Quill);
    
    if (!formatResult) {
      console.warn('📝 Failed to register suggestion formats with Quill');
      return;
    }
    
    // Add CSS to the document
    injectSuggestionCSS();
    
    console.log('📝 Suggestion formats initialized successfully');
  } catch (error) {
    console.error('📝 Error initializing suggestion formats:', error);
  }
};

/**
 * Inject the CSS needed for suggestion formats
 */
function injectSuggestionCSS(): void {
  // Check if the style tag already exists
  const styleId = 'suggestion-format-styles';
  if (document.getElementById(styleId)) {
    return;
  }
  
  // Create and append the style element
  const styleElement = document.createElement('style');
  styleElement.id = styleId;
  styleElement.textContent = suggestionFormatCSS;
  document.head.appendChild(styleElement);
  
  console.log('📝 Suggestion format CSS injected');
}

/**
 * Module registration for Quill
 */
export const SuggestionFormatModule = {
  name: 'suggestionFormat',
  
  register: function(Quill: typeof ReactQuill.Quill) {
    console.log('📝 Registering SuggestionFormatModule with Quill');
    
    // Register formats
    initializeSuggestionFormats(Quill);
    
    // Register the module with Quill
    Quill.register('modules/suggestionFormat', function(quill: any) {
      console.log('📝 Initializing SuggestionFormatModule for Quill instance');
      
      // Return a plain object instead of a class
      return {
        name: 'suggestionFormat',
        quill: quill,
        
        // Apply suggestion formats to the editor's content
        applySuggestionFormats: function(diffChanges: any[]) {
          console.log('📝 SuggestionFormatModule: Apply formats called with', diffChanges.length, 'changes');
        }
      };
    }, true); // Add true as second argument to force register
  }
};
