
/**
 * contentDiff.ts - Utilities for comparing content and generating diffs
 */
import { DeltaContent } from '@/utils/editor/types';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

// Types for diff operations
export type DiffChangeType = 'addition' | 'deletion' | 'modification' | 'unchanged';

export interface DiffSegment {
  type: DiffChangeType;
  content: string;
  startIndex?: number;
  endIndex?: number;
}

export interface LineDiff {
  originalContent: string;
  suggestedContent: string;
  segments: DiffSegment[];
  changeType: DiffChangeType;
}

/**
 * Convert any content type to plain text for comparison
 * This ensures we handle both string and Delta objects consistently
 */
const normalizeContent = (content: string | DeltaContent | null): string => {
  if (!content) return '';
  
  if (isDeltaObject(content)) {
    return extractPlainTextFromDelta(content);
  }
  
  if (typeof content === 'string') {
    try {
      // Check if it's a stringified Delta object
      const parsed = JSON.parse(content);
      if (parsed && parsed.ops && Array.isArray(parsed.ops)) {
        return extractPlainTextFromDelta(parsed);
      }
    } catch (e) {
      // Not JSON, treat as plain string
    }
    return content;
  }
  
  return String(content);
};

/**
 * Compare two strings character by character to identify changes
 */
export const generateCharacterDiff = (original: string, modified: string): DiffSegment[] => {
  console.log('🔄 Comparing:', { 
    originalType: typeof original,
    modifiedType: typeof modified,
    originalPreview: original.substring(0, 30) + (original.length > 30 ? '...' : ''),
    modifiedPreview: modified.substring(0, 30) + (modified.length > 30 ? '...' : '')
  });
  
  // Handle simple cases
  if (original === modified) {
    return [{ type: 'unchanged', content: original }];
  }
  
  if (!original) {
    return [{ type: 'addition', content: modified }];
  }
  
  if (!modified) {
    return [{ type: 'deletion', content: original }];
  }
  
  // For more complex cases, use a simple difference algorithm
  // This is a basic implementation - could be improved with a more sophisticated diff algorithm
  const segments: DiffSegment[] = [];
  
  // Find common prefix
  let prefixLength = 0;
  const minLength = Math.min(original.length, modified.length);
  
  while (prefixLength < minLength && 
         original[prefixLength] === modified[prefixLength]) {
    prefixLength++;
  }
  
  // Add common prefix if it exists
  if (prefixLength > 0) {
    segments.push({
      type: 'unchanged',
      content: original.substring(0, prefixLength),
      startIndex: 0,
      endIndex: prefixLength - 1
    });
  }
  
  // Find common suffix
  let suffixLength = 0;
  while (suffixLength < minLength - prefixLength && 
         original[original.length - 1 - suffixLength] === 
         modified[modified.length - 1 - suffixLength]) {
    suffixLength++;
  }
  
  // Add the middle different parts
  if (prefixLength < original.length - suffixLength) {
    segments.push({
      type: 'deletion',
      content: original.substring(prefixLength, original.length - suffixLength || undefined),
      startIndex: prefixLength,
      endIndex: original.length - suffixLength - 1
    });
  }
  
  if (prefixLength < modified.length - suffixLength) {
    segments.push({
      type: 'addition',
      content: modified.substring(prefixLength, modified.length - suffixLength || undefined),
      startIndex: prefixLength,
      endIndex: modified.length - suffixLength - 1
    });
  }
  
  // Add common suffix if it exists
  if (suffixLength > 0) {
    segments.push({
      type: 'unchanged',
      content: original.substring(original.length - suffixLength),
      startIndex: original.length - suffixLength,
      endIndex: original.length - 1
    });
  }
  
  console.log('🔄 Generated segments:', segments.length);
  return segments;
};

/**
 * Determine the overall change type for a line
 */
export const determineChangeType = (original: string, modified: string): DiffChangeType => {
  if (!original && modified) return 'addition';
  if (original && !modified) return 'deletion';
  if (original === modified) return 'unchanged';
  return 'modification';
};

/**
 * Generate a complete diff for a line including all segments and overall change type
 */
export const generateLineDiff = (original: string | DeltaContent | null, 
                              modified: string | DeltaContent | null): LineDiff => {
  const originalText = normalizeContent(original);
  const modifiedText = normalizeContent(modified);
  
  const changeType = determineChangeType(originalText, modifiedText);
  const segments = generateCharacterDiff(originalText, modifiedText);
  
  return {
    originalContent: originalText,
    suggestedContent: modifiedText,
    segments,
    changeType
  };
};
