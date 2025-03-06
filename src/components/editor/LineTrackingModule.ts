
// File: src/components/editor/LineTrackingModule.ts

import ReactQuill from 'react-quill';
import { LineTracker } from './LineTracker';
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

    // Mark as registered
    (ReactQuill.Quill as any)._lineTrackingModuleRegistered = true;

    // Register as a Quill module named 'lineTracking'
    ReactQuill.Quill.register('modules/lineTracking', function (quill: any) {
      console.log('🔍 [LineTrackingModule] initializing new LineTracker for Quill instance');
      const tracker = new LineTracker(quill);
      quill.lineTracking = tracker;
      return tracker;
    });
    
    // Also register the suggestion format module
    SuggestionFormatModule.register(Quill);
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
