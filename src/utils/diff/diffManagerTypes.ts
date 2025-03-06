
/**
 * diffManagerTypes.ts - Type definitions for DiffManager
 */
import { LineData } from '@/types/lineTypes';
import { LineDiff } from './contentDiff';
import { DeltaContent } from '@/utils/editor/types';

/**
 * Map of line UUIDs to their diffs
 */
export interface LineDiffMap {
  [lineUuid: string]: LineDiff;
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
