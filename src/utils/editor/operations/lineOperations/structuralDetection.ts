
/**
 * Functions for detecting structural changes in Delta content
 */

import { DeltaContent, DeltaOp } from '../../types';

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
