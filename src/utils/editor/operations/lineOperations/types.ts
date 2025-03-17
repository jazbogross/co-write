
/**
 * Types for line operations and analysis
 */

import { DeltaContent } from '../../types';

/**
 * Types of line operations that can be detected
 */
export enum LineOperationType {
  SPLIT = 'split',          // Enter in the middle of a line
  JOIN = 'join',            // Backspace at start of line (merges with previous)
  ADD = 'add',              // New line added
  DELETE = 'delete',        // Line deleted
  MODIFY = 'modify',        // Content changed but line structure unchanged
  ENTER_AT_START = 'enter-at-start', // Enter at position 0 (special case)
  NONE = 'none'             // No change to line structure
}

/**
 * Analysis result for a Delta change
 */
export interface LineOperationAnalysis {
  type: LineOperationType;
  affectedLineIndex: number;
  lineCountChange: number;
  containsNewlines: boolean;
  hasDeleteOp: boolean;
}
