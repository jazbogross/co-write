
/**
 * Utilities for content diffing
 */
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { DiffChangeType, DiffSegment, LineDiff } from './diffManagerTypes';

export interface DiffChange {
  type: 'add' | 'delete' | 'modify' | 'equal';
  text: string;
  originalText?: string;
  lineNumber?: number;
}

/**
 * Generates a simple diff between two text contents
 */
export function generateLineDiff(original: string, suggested: string): LineDiff {
  // If content is the same, return unchanged
  if (original === suggested) {
    return {
      segments: [{ text: original, type: DiffChangeType.UNCHANGED }],
      changeType: DiffChangeType.UNCHANGED
    };
  }
  
  // Simple diff implementation - in a real application would use a proper diff library
  return {
    segments: [
      { text: original, type: DiffChangeType.DELETED },
      { text: suggested, type: DiffChangeType.ADDED }
    ],
    changeType: DiffChangeType.MODIFIED
  };
}

/**
 * Generates a diff between two Delta contents
 */
export function generateDeltaDiff(original: DeltaContent, suggested: DeltaContent): LineDiff {
  // Extract plain text from both deltas
  const originalText = extractPlainTextFromDelta(original);
  const suggestedText = extractPlainTextFromDelta(suggested);
  
  // Use the text-based diff function
  return generateLineDiff(originalText, suggestedText);
}

/**
 * Generates a diff between any two content types (string or Delta)
 */
export function generateContentDiff(original: any, suggested: any): LineDiff {
  // Normalize content to strings
  const originalText = isDeltaObject(original) 
    ? extractPlainTextFromDelta(original) 
    : String(original);
    
  const suggestedText = isDeltaObject(suggested)
    ? extractPlainTextFromDelta(suggested)
    : String(suggested);
  
  // Generate diff between normalized text
  return generateLineDiff(originalText, suggestedText);
}

/**
 * Analyzes differences between two text contents and returns structured change data
 * with line number estimation
 */
export function analyzeDeltaDifferences(
  originalText: string, 
  suggestedText: string
): { changes: DiffChange[], lineNumber?: number } {
  // If texts are identical, return no changes
  if (originalText === suggestedText) {
    return { changes: [] };
  }
  
  // Split content into lines
  const originalLines = originalText.split('\n');
  const suggestedLines = suggestedText.split('\n');
  
  // For simple implementation, find the first line that differs
  let firstDifferentLine = -1;
  
  // Find the first differing line
  for (let i = 0; i < Math.max(originalLines.length, suggestedLines.length); i++) {
    if (i >= originalLines.length || i >= suggestedLines.length || 
        originalLines[i] !== suggestedLines[i]) {
      firstDifferentLine = i;
      break;
    }
  }
  
  // For a basic implementation, assume a single change:
  // If suggested has more lines, it's an addition
  // If original has more lines, it's a deletion
  // If same number but content differs, it's a modification
  let changeType: 'add' | 'delete' | 'modify' = 'modify';
  
  if (suggestedLines.length > originalLines.length) {
    changeType = 'add';
  } else if (originalLines.length > suggestedLines.length) {
    changeType = 'delete';
  }
  
  // Create a change object based on what we found
  const changes: DiffChange[] = [];
  
  if (changeType === 'modify') {
    // In case of modification, log both original and new content
    changes.push({
      type: 'modify',
      text: suggestedLines[firstDifferentLine] || '',
      originalText: originalLines[firstDifferentLine] || '',
      lineNumber: firstDifferentLine + 1
    });
  } else if (changeType === 'add') {
    // For addition, include the new content
    changes.push({
      type: 'add',
      text: suggestedLines[firstDifferentLine] || '',
      lineNumber: firstDifferentLine + 1
    });
  } else if (changeType === 'delete') {
    // For deletion, include the removed content
    changes.push({
      type: 'delete',
      text: '',
      originalText: originalLines[firstDifferentLine] || '',
      lineNumber: firstDifferentLine + 1
    });
  }
  
  return { 
    changes, 
    lineNumber: firstDifferentLine + 1 
  };
}

/**
 * Determines if content has changed
 */
export function hasContentChanged(original: any, suggested: any): boolean {
  // Normalize content to strings
  const originalText = isDeltaObject(original)
    ? extractPlainTextFromDelta(original)
    : String(original);
    
  const suggestedText = isDeltaObject(suggested)
    ? extractPlainTextFromDelta(suggested)
    : String(suggested);
  
  // Compare normalized text
  return originalText !== suggestedText;
}
