/**
 * Functions for analyzing and handling line operations in Delta content
 */
import { DeltaContent, DeltaOp } from '../types';
import { extractPlainTextFromDelta } from '../content/textExtraction';

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

/**
 * Check if a Delta operation contains structural changes (line additions or removals)
 */
export const hasStructuralChange = (delta: DeltaContent): boolean => {
  if (!delta || !Array.isArray(delta.ops)) return false;
  
  for (const op of delta.ops) {
    // Check for newline insertions
    if (op.insert && typeof op.insert === 'string' && op.insert.includes('\n')) {
      return true;
    }
    
    // Check for large deletions that might contain newlines
    if (op.delete && op.delete > 1) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check for the special case of Enter at the start of a line
 */
export const isEnterAtLineStart = (delta: DeltaContent, cursorPos: number = 0): boolean => {
  if (!delta || !Array.isArray(delta.ops)) return false;
  
  // Look for a newline insertion without retain (at current position)
  for (const op of delta.ops) {
    if (op.insert === '\n' && (op.retain === undefined || op.retain === cursorPos)) {
      return true;
    }
  }
  
  return false;
};

/**
 * Check if an operation is a line join (backspace at start of line)
 */
export const isLineJoinOperation = (delta: DeltaContent): boolean => {
  if (!delta || !Array.isArray(delta.ops)) return false;
  
  // A line join typically has a delete operation
  let hasDelete = false;
  
  for (const op of delta.ops) {
    if (op.delete) {
      hasDelete = true;
    }
  }
  
  return hasDelete;
};

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

/**
 * Get text content of a line at a specific index in a Delta
 */
export const getLineTextAtIndex = (delta: DeltaContent, lineIndex: number): string => {
  const text = extractPlainTextFromDelta(delta);
  const lines = text.split('\n');
  
  if (lineIndex >= 0 && lineIndex < lines.length) {
    return lines[lineIndex];
  }
  
  return '';
};

/**
 * Calculate cursor position at the start of a specific line
 */
export const getCursorPositionForLine = (delta: DeltaContent, lineIndex: number): number => {
  const text = extractPlainTextFromDelta(delta);
  const lines = text.split('\n');
  
  let position = 0;
  for (let i = 0; i < lineIndex; i++) {
    if (i < lines.length) {
      position += lines[i].length + 1; // +1 for the newline
    }
  }
  
  return position;
};

/**
 * Get the line index at a specific cursor position
 */
export const getLineIndexAtPosition = (delta: DeltaContent, position: number): number => {
  const text = extractPlainTextFromDelta(delta);
  
  let currentPos = 0;
  let lineIndex = 0;
  
  // Iterate through text until we find the position
  for (let i = 0; i < text.length; i++) {
    if (currentPos >= position) {
      break;
    }
    
    if (text[i] === '\n') {
      lineIndex++;
    }
    
    currentPos++;
  }
  
  return lineIndex;
};
