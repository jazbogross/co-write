/**
 * lineGrouping.ts - Utilities for grouping changed lines
 */
import { ChangedLine } from './diffManagerTypes';

/**
 * Group changes by consecutive line numbers for UI grouping
 */
export function groupConsecutiveChanges(changedLines: ChangedLine[]): ChangedLine[][] {
  if (changedLines.length === 0) return [];
  
  // Sort by line number first
  const sortedLines = [...changedLines].sort((a, b) => a.lineNumber - b.lineNumber);
  
  const groups: ChangedLine[][] = [];
  let currentGroup: ChangedLine[] = [sortedLines[0]];
  
  for (let i = 1; i < sortedLines.length; i++) {
    const prevLine = sortedLines[i - 1];
    const currentLine = sortedLines[i];
    
    // If this line is consecutive to the previous one, add to current group
    if (currentLine.lineNumber === prevLine.lineNumber + 1) {
      currentGroup.push(currentLine);
    } else {
      // Otherwise start a new group
      groups.push(currentGroup);
      currentGroup = [currentLine];
    }
  }
  
  // Don't forget to add the last group
  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }
  
  return groups;
}
