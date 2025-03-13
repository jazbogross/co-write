/**
 * Utilities for content diffing
 */
import { DeltaContent } from '@/utils/editor/types';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';
import { DiffChangeType, DiffSegment, LineDiff } from './diffManagerTypes';

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
