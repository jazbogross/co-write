
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
  index: number; // Required for tracking in diff processing
  startIndex?: number;
  endIndex?: number;
  originalLineNumber?: number;
  suggestedLineNumber?: number;
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
 * with accurate line number for each change
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
  
  const changes: DiffChange[] = [];
  
  // Improved algorithm that better handles line insertions
  // Use Longest Common Subsequence (LCS) approach
  let i = 0, j = 0;
  const maxOriginalLines = originalLines.length;
  const maxSuggestedLines = suggestedLines.length;
  
  // Compare line by line with improved tracking of line numbers
  while (i < maxOriginalLines || j < maxSuggestedLines) {
    const originalLine = i < maxOriginalLines ? originalLines[i] : '';
    const suggestedLine = j < maxSuggestedLines ? suggestedLines[j] : '';
    
    // Skip empty lines at the end
    if (i >= maxOriginalLines && !suggestedLine.trim()) {
      j++;
      continue;
    }
    
    if (j >= maxSuggestedLines && !originalLine.trim()) {
      i++;
      continue;
    }
    
    // Case 1: Lines are identical - nothing to report, move both counters
    if (originalLine === suggestedLine) {
      i++;
      j++;
      continue;
    }
    
    // Case 2: Check if the current line in original exists later in suggested
    // This would indicate new lines were added before
    let foundLater = false;
    if (originalLine.trim() !== '') {
      for (let lookAhead = j + 1; lookAhead < Math.min(j + 5, maxSuggestedLines); lookAhead++) {
        if (originalLines[i] === suggestedLines[lookAhead]) {
          // Found the line later - these are added lines
          for (let k = j; k < lookAhead; k++) {
            changes.push({
              type: 'add',
              text: suggestedLines[k],
              lineNumber: k + 1,
              index: k
            });
          }
          
          j = lookAhead + 1;
          i++;
          foundLater = true;
          break;
        }
      }
    }
    
    if (foundLater) {
      continue;
    }
    
    // Case 3: Check if current line in suggested exists later in original
    // This would indicate lines were deleted
    let foundInOriginal = false;
    if (suggestedLine.trim() !== '') {
      for (let lookAhead = i + 1; lookAhead < Math.min(i + 5, maxOriginalLines); lookAhead++) {
        if (suggestedLines[j] === originalLines[lookAhead]) {
          // Found the line later in original - deleted lines
          for (let k = i; k < lookAhead; k++) {
            changes.push({
              type: 'delete',
              text: '',
              originalText: originalLines[k],
              lineNumber: j + 1, // Report at the current position in suggested
              originalLineNumber: k + 1,
              index: k
            });
          }
          
          i = lookAhead + 1;
          j++;
          foundInOriginal = true;
          break;
        }
      }
    }
    
    if (foundInOriginal) {
      continue;
    }
    
    // Case 4: Line is modified
    changes.push({
      type: 'modify',
      text: suggestedLine,
      originalText: originalLine,
      lineNumber: j + 1,
      originalLineNumber: i + 1,
      index: Math.min(i, j)
    });
    
    i++;
    j++;
  }
  
  return { 
    changes,
    lineNumber: changes.length > 0 ? changes[0].lineNumber : undefined
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
