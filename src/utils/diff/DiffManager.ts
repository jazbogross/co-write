
/**
 * DiffManager.ts - Manages diffs between original content and suggestions
 */
import { LineData } from '@/types/lineTypes';
import { generateLineDiff, LineDiff } from './contentDiff';
import { LineDiffMap, ChangedLine, DiffSummary } from './diffManagerTypes';
import { groupConsecutiveChanges } from './lineGrouping';
import { detectFormattingChanges } from './changeDetection';

export class DiffManager {
  /**
   * Generate diff between original lines and suggested content
   */
  static generateDiff(originalLines: LineData[], suggestedLines: LineData[]): LineDiffMap {
    const diffMap: LineDiffMap = {};

    const originalLineMap = new Map(originalLines.map(line => [line.uuid, line]));
    
    suggestedLines.forEach((suggestedLine) => {
        if (!suggestedLine.uuid) return; // Skip if no UUID

        const originalLine = originalLineMap.get(suggestedLine.uuid);
        if (!originalLine || originalLine.content !== suggestedLine.content) {
            // Only include in diff if content has changed
            diffMap[suggestedLine.uuid] = generateLineDiff(originalLine?.content || "", suggestedLine.content);
        }
    });

    return diffMap;
}

  
  /**
   * Generate a summary of all changes
   */
  static generateDiffSummary(originalLines: LineData[], suggestedLines: LineData[]): DiffSummary {
    const diffMap = this.generateDiff(originalLines, suggestedLines);
    
    const changedLines: ChangedLine[] = [];
    let additions = 0;
    let deletions = 0;
    let modifications = 0;
    
    // Process each line diff
    Object.entries(diffMap).forEach(([lineUuid, diff]) => {
      if (diff.changeType === 'unchanged') return;
      
      // Find the corresponding line data
      const originalLine = originalLines.find(line => line.uuid === lineUuid);
      const suggestedLine = suggestedLines.find(line => line.uuid === lineUuid);
      
      // Skip if we can't determine line number
      if (!originalLine && !suggestedLine) return;
      
      // Count by change type
      switch (diff.changeType) {
        case 'addition':
          additions++;
          break;
        case 'deletion':
          deletions++;
          break;
        case 'modification':
          modifications++;
          break;
      }
      
      // Add to changed lines list
      changedLines.push({
        lineUuid,
        lineNumber: (originalLine?.lineNumber || suggestedLine?.lineNumber || 0),
        originalContent: originalLine?.content || '',
        suggestedContent: suggestedLine?.content || '',
        diff
      });
    });
    
    // Sort by line number
    changedLines.sort((a, b) => a.lineNumber - b.lineNumber);
    
    return {
      totalChanges: additions + deletions + modifications,
      additions,
      deletions,
      modifications,
      changedLines
    };
  }
  
  // Re-export utility functions for convenience
  static groupConsecutiveChanges = groupConsecutiveChanges;
  static detectFormattingChanges = detectFormattingChanges;
}
