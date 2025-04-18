
// File: src/components/editor/LineTrackingModule.ts

import ReactQuill from 'react-quill';
import { LineTracker } from './trackers/LineTracker';
import { SuggestionFormatModule } from './SuggestionFormatModule';

const Quill = ReactQuill.Quill;

/**
 * Singleton module definition for line tracking. We mark
 * _lineTrackingModuleRegistered on ReactQuill.Quill to avoid multiple registration.
 */
export const LineTrackingModule = {
  name: 'lineTracking',
  register: function (Quill: any) {
    // If we've already registered, skip
    if ((ReactQuill.Quill as any)._lineTrackingModuleRegistered) {
      return;
    }

    try {
      // Register the suggestion format module FIRST if it hasn't been registered
      if (!(ReactQuill.Quill as any)._suggestionFormatModuleRegistered) {
        SuggestionFormatModule.register(Quill);
      }
      
      // Mark as registered
      (ReactQuill.Quill as any)._lineTrackingModuleRegistered = true;

      // Register as a Quill module named 'lineTracking'
      ReactQuill.Quill.register('modules/lineTracking', function (quill: any) {
        const tracker = new LineTracker(quill);
        quill.lineTracking = tracker;
        return tracker;
      });
    } catch (error) {
      console.error('Error during LineTrackingModule registration:', error);
    }
  },
};

// This is how we'll configure the module in TextEditor
export const EDITOR_MODULES = {
  toolbar: false,
  lineTracking: true,
  suggestionFormat: true,
  clipboard: {
    // Allow paste with formatting
    matchVisual: true,
  },
};

// Export the SuggestionFormatModule
export { SuggestionFormatModule };
