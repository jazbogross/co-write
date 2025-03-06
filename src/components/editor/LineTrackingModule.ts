
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
    console.log('🔍 [LineTrackingModule] registering with Quill');

    // If we've already registered, skip
    if ((ReactQuill.Quill as any)._lineTrackingModuleRegistered) {
      console.log('🔍 [LineTrackingModule] already registered, skipping');
      return;
    }

    try {
      // Register the suggestion format module FIRST if it hasn't been registered
      if (!(ReactQuill.Quill as any)._suggestionFormatModuleRegistered) {
        console.log('🔍 [LineTrackingModule] registering SuggestionFormatModule');
        SuggestionFormatModule.register(Quill);
        (ReactQuill.Quill as any)._suggestionFormatModuleRegistered = true;
      }
      
      // Mark as registered
      (ReactQuill.Quill as any)._lineTrackingModuleRegistered = true;

      // Register as a Quill module named 'lineTracking'
      ReactQuill.Quill.register('modules/lineTracking', function (quill: any) {
        console.log('🔍 [LineTrackingModule] initializing new LineTracker for Quill instance');
        const tracker = new LineTracker(quill);
        quill.lineTracking = tracker;
        return tracker;
      });
    } catch (error) {
      console.error('🔍 [LineTrackingModule] error during registration:', error);
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
