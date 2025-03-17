
/**
 * Functions for handling line positions and cursor positions
 */

import { DeltaContent } from '../../types';
import { extractPlainTextFromDelta } from '../../content/textExtraction';

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
