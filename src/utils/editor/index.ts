
/**
 * Re-exports all editor utilities
 */

export * from './deltaUtils';
export * from './types';
export * from './validation/deltaValidation';
export * from './textFormatting/textExtraction';
export * from './content/insertionUtils';
export * from './content/textExtraction';
export * from './reconstructUtils';

// Export individual utility functions
import { DeltaContent } from './types';
import { 
  isDeltaObject,
  safelyParseDelta,
  createEmptyDelta,
  convertToDelta
} from './operations/deltaOperations';

import {
  combineDeltaContents,
  createDeltaFromLineData
} from './operations/deltaCombination';

import {
  extractPlainTextFromDelta,
  extractTextFromDeltaOps
} from './textFormatting/textExtraction';

// Editor utilities imports
import { extractLineContents, preserveFormattedContent } from '../editorUtils';

// Re-export functions
export {
  isDeltaObject,
  safelyParseDelta,
  createEmptyDelta,
  convertToDelta,
  combineDeltaContents,
  createDeltaFromLineData,
  extractPlainTextFromDelta,
  extractTextFromDeltaOps,
  // Editor utilities
  extractLineContents,
  preserveFormattedContent
};

// Also export reconstructContent for useContentInitialization.tsx
export { reconstructContent } from './reconstructUtils';
