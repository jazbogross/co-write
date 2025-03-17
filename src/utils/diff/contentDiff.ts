
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
 * Finds all lines that contain changes between original and suggested text
 */
function findChangedLines(originalLines: string[], suggestedLines: string[]): number[] {
  const changedLineIndices: number[] = [];
  
  // Find all lines that differ
  for (let i = 0; i < Math.max(originalLines.length, suggestedLines.length); i++) {
    if (i >= originalLines.length || i >= suggestedLines.length || 
        originalLines[i] !== suggestedLines[i]) {
      changedLineIndices.push(i);
    }
  }
  
  return changedLineIndices;
}

/**
 * Analyzes differences between two text contents and returns structured change data
 * with line number estimation for ALL changes
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
  
  // Find all changed line indices
  const changedLineIndices = findChangedLines(originalLines, suggestedLines);
  
  if (changedLineIndices.length === 0) {
    return { changes: [] };
  }
  
  // Create change objects for each changed line
  const changes: DiffChange[] = [];
  let lineOffset = 0; // Track line number adjustments as we go
  
  changedLineIndices.forEach((lineIndex, index) => {
    const originalLine = lineIndex < originalLines.length ? originalLines[lineIndex] : '';
    const suggestedLine = lineIndex < suggestedLines.length ? suggestedLines[lineIndex] : '';
    const currentLineNumber = lineIndex + 1;
    
    // Apply current line offset when calculating line numbers
    const adjustedOriginalLineNumber = currentLineNumber;
    const adjustedSuggestedLineNumber = currentLineNumber + lineOffset;
    
    if (!originalLine && suggestedLine) {
      // Line added
      changes.push({
        type: 'add',
        text: suggestedLine,
        lineNumber: currentLineNumber,
        index: index, // Store index for tracking in diff viewer
        originalLineNumber: adjustedOriginalLineNumber,
        suggestedLineNumber: adjustedSuggestedLineNumber
      });
      lineOffset += 1; // Increment offset when a line is added
    } else if (originalLine && !suggestedLine) {
      // Line deleted
      changes.push({
        type: 'delete',
        text: '',
        originalText: originalLine,
        lineNumber: currentLineNumber,
        index: index, // Store index for tracking in diff viewer
        originalLineNumber: adjustedOriginalLineNumber,
        suggestedLineNumber: adjustedSuggestedLineNumber
      });
      lineOffset -= 1; // Decrement offset when a line is deleted
    } else {
      // Line modified
      changes.push({
        type: 'modify',
        text: suggestedLine,
        originalText: originalLine,
        lineNumber: currentLineNumber,
        index: index, // Store index for tracking in diff viewer
        originalLineNumber: adjustedOriginalLineNumber,
        suggestedLineNumber: adjustedSuggestedLineNumber
      });
    }
  });
  
  return { 
    changes,
    lineNumber: changedLineIndices[0] + 1  // Return the first changed line for backward compatibility
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

