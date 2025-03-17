/**
 * Functions for analyzing line operations in delta changes
 */

import { DeltaContent } from '../../types';
import { LineOperationType, LineOperationAnalysis } from './types';
import { isEnterAtLineStart, isLineJoinOperation } from './structuralDetection';

/**
 * Analyze a Delta change to determine the type of line operation
 */
export const analyzeLineOperation = (
  delta: DeltaContent,
  oldLineCount: number,
  newLineCount: number,
  cursorIndex: number = 0
): LineOperationAnalysis => {
  // Default analysis result
  const result: LineOperationAnalysis = {
    type: LineOperationType.NONE,
    affectedLineIndex: -1,
    lineCountChange: newLineCount - oldLineCount,
    containsNewlines: false,
    hasDeleteOp: false
  };
  
  if (!delta || !Array.isArray(delta.ops)) {
    return result;
  }
  
  // Check for newlines and deletes
  for (const op of delta.ops) {
    if (op.insert && typeof op.insert === 'string' && op.insert.includes('\n')) {
      result.containsNewlines = true;
    }
    if (op.delete) {
      result.hasDeleteOp = true;
    }
  }
  
  // Determine affected line index based on retain value
  const firstRetain = delta.ops.find(op => op.retain !== undefined);
  if (firstRetain) {
    // Retain indicates cursor position - determine line from this
    result.affectedLineIndex = 0; // This would need actual line calculation in real implementation
  }
  
  // Determine operation type based on line count changes and operations
  if (newLineCount > oldLineCount) {
    // Line added
    if (isEnterAtLineStart(delta, cursorIndex)) {
      result.type = LineOperationType.ENTER_AT_START;
    } else if (result.containsNewlines) {
      // Check if it's a pure newline insertion (split) or content with newlines (add)
      const hasPureNewline = delta.ops.some(op => op.insert === '\n');
      result.type = hasPureNewline ? LineOperationType.SPLIT : LineOperationType.ADD;
    }
  } else if (newLineCount < oldLineCount) {
    // Line removed
    result.type = isLineJoinOperation(delta) 
      ? LineOperationType.JOIN 
      : LineOperationType.DELETE;
  } else {
    // Line count unchanged - probably just content modification
    result.type = LineOperationType.MODIFY;
  }
  
  return result;
};
