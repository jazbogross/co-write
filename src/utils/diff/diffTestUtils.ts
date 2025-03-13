
/**
 * Utilities for testing diff generation
 */
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';
import { LineDiff, DiffSegment, DiffChangeType } from './diffManagerTypes';

/**
 * Create a test diff for the given original and suggested content
 */
export const createTestDiff = (
  original: string | DeltaContent,
  suggested: string | DeltaContent
): LineDiff => {
  return {
    segments: [
      { text: typeof original === 'string' ? original : JSON.stringify(original), type: DiffChangeType.DELETED },
      { text: typeof suggested === 'string' ? suggested : JSON.stringify(suggested), type: DiffChangeType.ADDED }
    ],
    changeType: DiffChangeType.MODIFIED
  };
};

/**
 * Create test line data with original and suggested content
 */
export const createTestLineData = (
  lineUuid: string,
  lineNumber: number,
  original: string | DeltaContent,
  suggested: string | DeltaContent
): LineData => {
  return {
    uuid: lineUuid,
    lineNumber,
    content: suggested,
    originalContent: original,
    originalAuthor: 'test-author',
    editedBy: ['test-editor'],
    hasDraft: true
  };
};

/**
 * Create test segments for diffing
 */
export const createTestSegments = (
  originalText: string,
  suggestedText: string,
  changeType: DiffChangeType = DiffChangeType.MODIFIED
): DiffSegment[] => {
  if (changeType === DiffChangeType.UNCHANGED) {
    return [{ text: originalText, type: DiffChangeType.UNCHANGED }];
  }
  
  if (changeType === DiffChangeType.ADDED) {
    return [{ text: suggestedText, type: DiffChangeType.ADDED }];
  }
  
  if (changeType === DiffChangeType.DELETED) {
    return [{ text: originalText, type: DiffChangeType.DELETED }];
  }
  
  // For modified, show both deletion and addition
  return [
    { text: originalText, type: DiffChangeType.DELETED },
    { text: suggestedText, type: DiffChangeType.ADDED }
  ];
};
