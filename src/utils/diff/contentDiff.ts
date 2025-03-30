
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
  
  // Find exact line-by-line differences
  const maxLines = Math.max(originalLines.length, suggestedLines.length);
  
  // Map to track actual line numbers in final document
  // This prevents showing all original content as deleted and all new content as added
  for (let i = 0; i < maxLines; i++) {
    const originalLine = i < originalLines.length ? originalLines[i] : '';
    const suggestedLine = i < suggestedLines.length ? suggestedLines[i] : '';
    
    // Skip completely identical lines
    if (originalLine === suggestedLine) {
      continue;
    }
    
    // Only create change objects for lines that actually differ
    if (!originalLine && suggestedLine) {
      // Line added
      changes.push({
        type: 'add',
        text: suggestedLine,
        lineNumber: i + 1, // 1-based line numbers for display
        index: i
      });
    } else if (originalLine && !suggestedLine) {
      // Line deleted
      changes.push({
        type: 'delete',
        text: '',
        originalText: originalLine,
        lineNumber: i + 1,
        index: i
      });
    } else if (originalLine !== suggestedLine) {
      // Line modified
      changes.push({
        type: 'modify',
        text: suggestedLine,
        originalText: originalLine,
        lineNumber: i + 1,
        index: i
      });
    }
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
