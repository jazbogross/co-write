
import { useEffect } from 'react';
import ReactQuill from 'react-quill';
import { SuggestionFormatModule } from '@/components/editor/SuggestionFormatModule';
import { suggestionFormatCSS } from '@/utils/editor/formats';

export const useEditorInitializer = () => {
  // Register Quill formats and modules
  useEffect(() => {
    // Register the suggestion format module before ReactQuill tries to use it
    const Quill = ReactQuill.Quill;
    if (!(Quill as any)._suggestionFormatModuleRegistered) {
      SuggestionFormatModule.register(Quill);
    }
  }, []);

  // Add styles to the head
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = suggestionFormatCSS;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  return { initialized: true };
};
