
/**
 * diffManagerTypes.ts - Type definitions for DiffManager
 */
import { LineData } from '@/types/lineTypes';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Map of line UUIDs to their diffs
 */
export interface LineDiffMap {
  [lineUuid: string]: LineDiff;
}

/**
 * Represents a diff between original and suggestion content
 */
export interface LineDiff {
  segments: DiffSegment[];
  changeType: DiffChangeType;
}

/**
 * Different types of changes that can occur
 */
export enum DiffChangeType {
  ADDED = 'added',
  DELETED = 'deleted',
  MODIFIED = 'modified',
  UNCHANGED = 'unchanged'
}

/**
 * A segment of text with change information
 */
export interface DiffSegment {
  text: string;
  type: DiffChangeType;
}

/**
 * Represents a line that has changed between original and suggestion
 */
export interface ChangedLine {
  lineUuid: string;
  lineNumber: number;
  originalContent: string | DeltaContent;
  suggestedContent: string | DeltaContent;
  diff: LineDiff;
}

/**
 * Summary of all changes in a diff
 */
export interface DiffSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  changedLines: ChangedLine[];
}

// Re-export types as types (for isolatedModules)
export type { DiffChangeType, DiffSegment, LineDiff };
