
import { useEffect } from 'react';
import ReactQuill from 'react-quill';
import { SuggestionFormatModule, suggestionFormatCSS } from '@/components/editor/SuggestionFormatModule';

export const useEditorInitializer = () => {
  // Register Quill formats and modules
  useEffect(() => {
    // Register the suggestion format module before ReactQuill tries to use it
    const Quill = ReactQuill.Quill;
    SuggestionFormatModule.register(Quill);
  }, []);

  // Add styles to the head
  useEffect(() => {
    const styleId = 'suggestion-format-styles';
    
    // Check if styles are already added
    if (!document.getElementById(styleId)) {
      const styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = suggestionFormatCSS;
      document.head.appendChild(styleElement);
      
      return () => {
        const existingStyle = document.getElementById(styleId);
        if (existingStyle) {
          document.head.removeChild(existingStyle);
        }
      };
    }
  }, []);

  return { initialized: true };
};
