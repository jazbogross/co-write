
import { DeltaContent, DeltaOp } from './types';
import { extractPlainTextFromDelta } from './content/textExtraction';
import { isDeltaObject, safelyParseDelta } from './operations/deltaOperations';
import { validateDelta } from './validation/deltaValidation';
import { LineOperationType, analyzeLineOperation } from './operations/lineOperations';
import { LineUuidMap } from './tracking/LineUuidMap';
import { LineUuidPreserver } from './tracking/LineUuidPreserver';
import { 
  ensureAllLinesHaveUuids,
  generateLineUuid,
  handleLineSplit,
  handleLineMerge
} from './tracking/lineUuidUtils';

/**
 * Check if a value is a Delta object
 */
export { isDeltaObject } from './operations/deltaOperations';

/**
 * Extract plain text from a Delta object
 */
export { extractPlainTextFromDelta } from './content/textExtraction';

/**
 * Combine multiple Delta contents into a single Delta
 */
export { combineDeltaContents } from './operations/deltaCombination';

/**
 * Log Delta structure for debugging
 */
export { logDeltaStructure } from './debug/deltaDebug';

/**
 * Safely parse a Delta from string or object
 */
export { safelyParseDelta } from './operations/deltaOperations';

// Export line operation utilities
export { 
  LineOperationType,
  analyzeLineOperation,
  hasStructuralChange,
  isEnterAtLineStart,
  isLineJoinOperation,
  getLineTextAtIndex,
  getCursorPositionForLine,
  getLineIndexAtPosition
} from './operations/lineOperations';

// Export line UUID tracking utilities
export {
  LineUuidMap,
  LineUuidPreserver,
  ensureAllLinesHaveUuids,
  generateLineUuid,
  handleLineSplit,
  handleLineMerge
};

// Re-export the types
export * from './types';

// For backward compatibility
export const reconstructContent = (lineData: any[]): DeltaContent => {
  // For empty line data, return empty Delta
  if (!lineData || lineData.length === 0) {
    return { ops: [{ insert: '\n' }] };
  }
  
  // Initialize with first line's content
  let result: DeltaContent = { ops: [] };
  
  // Process each line
  lineData.forEach(line => {
    if (isDeltaObject(line.content)) {
      // Add ops from this line's Delta
      result.ops = [...result.ops, ...line.content.ops];
    } else if (typeof line.content === 'string') {
      // Convert string to Delta op
      result.ops.push({ insert: line.content + '\n' });
    }
  });
  
  // Ensure we have at least a newline
  if (result.ops.length === 0) {
    result.ops.push({ insert: '\n' });
  }
  
  return result;
};
