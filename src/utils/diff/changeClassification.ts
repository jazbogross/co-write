
/**
 * changeClassification.ts - Utilities for classifying changes
 */
import { DiffChangeType, ChangedLine } from './diffManagerTypes';

export interface ChangeClassification {
  isAddition: boolean;
  isDeletion: boolean;
  isModification: boolean;
  hasFormatChanges: boolean;
  description: string;
}

/**
 * Generate a human-readable description of the change
 */
const generateChangeDescription = (changeType: DiffChangeType, segmentCount: number): string => {
  switch (changeType) {
    case DiffChangeType.ADDED:
      return 'Added new line';
    case DiffChangeType.DELETED:
      return 'Deleted line';
    case DiffChangeType.MODIFIED:
      if (segmentCount <= 2) return 'Minor text change';
      return 'Modified text';
    default:
      return 'No change';
  }
};

/**
 * Classify a changed line to determine its characteristics
 */
export const classifyChange = (changedLine: ChangedLine): ChangeClassification => {
  const { diff } = changedLine;
  
  // Determine if this is an addition, deletion, or modification
  const isAddition = diff.changeType === DiffChangeType.ADDED;
  const isDeletion = diff.changeType === DiffChangeType.DELETED;
  const isModification = diff.changeType === DiffChangeType.MODIFIED;
  
  // Check if any segments have formatting changes
  const hasFormatChanges = false; // This would require more complex Delta comparison
  
  // Generate a description of the change
  const description = generateChangeDescription(diff.changeType, diff.segments.length);
  
  return {
    isAddition,
    isDeletion,
    isModification,
    hasFormatChanges,
    description
  };
};

/**
 * Get counts of additions, deletions, and modifications in a set of changes
 */
export const getChangeCounts = (changedLines: ChangedLine[]): { additions: number, deletions: number, modifications: number } => {
  let additions = 0;
  let deletions = 0;
  let modifications = 0;
  
  changedLines.forEach(line => {
    const classification = classifyChange(line);
    if (classification.isAddition) additions++;
    if (classification.isDeletion) deletions++;
    if (classification.isModification) modifications++;
  });
  
  return {
    additions,
    deletions,
    modifications
  };
};

/**
 * Get a summary of changes for display
 */
export const getChangeSummary = (changedLines: ChangedLine[]): string => {
  const counts = getChangeCounts(changedLines);
  
  const parts = [];
  if (counts.additions > 0) {
    parts.push(`${counts.additions} addition${counts.additions !== 1 ? 's' : ''}`);
  }
  if (counts.deletions > 0) {
    parts.push(`${counts.deletions} deletion${counts.deletions !== 1 ? 's' : ''}`);
  }
  if (counts.modifications > 0) {
    parts.push(`${counts.modifications} modification${counts.modifications !== 1 ? 's' : ''}`);
  }
  
  if (parts.length === 0) return 'No changes';
  
  return parts.join(', ');
};
