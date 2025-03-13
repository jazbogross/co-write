
import { LineDiff, DiffSegment, DiffChangeType, ChangedLine } from './diffManagerTypes';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Creates a mock diff between original and suggested content
 */
export const createMockDiff = (
  original: string | DeltaContent,
  suggested: string | DeltaContent
): LineDiff => {
  // For simplicity in testing, use strings
  const originalText = typeof original === 'string' ? original : JSON.stringify(original);
  const suggestedText = typeof suggested === 'string' ? suggested : JSON.stringify(suggested);
  
  // Basic segments for testing
  const segments: DiffSegment[] = [
    { text: originalText, type: DiffChangeType.DELETED },
    { text: suggestedText, type: DiffChangeType.ADDED }
  ];
  
  return {
    segments,
    changeType: DiffChangeType.MODIFIED
  };
};

/**
 * Creates a test line with original and suggested content
 */
export const createTestChangedLine = (
  lineUuid: string,
  lineNumber: number,
  original: string | DeltaContent,
  suggested: string | DeltaContent
): ChangedLine => {
  return {
    lineUuid,
    lineNumber,
    originalContent: original,
    suggestedContent: suggested,
    diff: createMockDiff(original, suggested)
  };
};

/**
 * Creates arrays of lines for testing
 */
export const createTestLineArrays = (
  count: number,
  withChanges: boolean = true
): { originalLines: any[], suggestedLines: any[] } => {
  const originalLines = [];
  const suggestedLines = [];
  
  for (let i = 0; i < count; i++) {
    const uuid = `test-uuid-${i}`;
    const originalContent = `Original line ${i}`;
    const suggestedContent = withChanges ? `Changed line ${i}` : originalContent;
    
    originalLines.push({
      uuid,
      lineNumber: i + 1,
      content: originalContent
    });
    
    suggestedLines.push({
      uuid,
      lineNumber: i + 1,
      content: suggestedContent
    });
  }
  
  return {
    originalLines,
    suggestedLines
  };
};
