
// Import the LineTracker implementation
import { LineTracker, LineTrackingModule } from './LineTracker';

// Export the LineTrackingModule for use in TextEditor
export { LineTrackingModule };

// This is how we'll configure the module in TextEditor
export const EDITOR_MODULES = {
  toolbar: false,
  lineTracking: true,
  clipboard: {
    // Allow paste with formatting
    matchVisual: true,
  },
};
