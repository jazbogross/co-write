
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
    console.log('🔄 DiffManager: Generating diff between', originalLines.length, 'original lines and', 
                suggestedLines.length, 'suggested lines');
    
    const diffMap: LineDiffMap = {};
    
    // Create a map of original lines by UUID for quick lookup
    const originalLineMap = new Map<string, LineData>();
    originalLines.forEach(line => {
      if (line.uuid) {
        originalLineMap.set(line.uuid, line);
      }
    });
    
    // Process each suggested line
    suggestedLines.forEach(suggestedLine => {
      if (!suggestedLine.uuid) return;
      
      const originalLine = originalLineMap.get(suggestedLine.uuid);
      
      // If we can't find the original line by UUID, it might be a new line
      if (!originalLine) {
        const emptyDiff = generateLineDiff('', suggestedLine.content);
        diffMap[suggestedLine.uuid] = emptyDiff;
        return;
      }
      
      // Generate diff between original and suggested content
      const diff = generateLineDiff(originalLine.content, suggestedLine.content);
      diffMap[suggestedLine.uuid] = diff;
    });
    
    // Check for deleted lines (in original but not in suggestion)
    const suggestedUuids = new Set(suggestedLines.map(line => line.uuid));
    
    originalLines.forEach(originalLine => {
      if (!originalLine.uuid) return;
      
      if (!suggestedUuids.has(originalLine.uuid)) {
        // This is a deleted line
        const diff = generateLineDiff(originalLine.content, '');
        diffMap[originalLine.uuid] = diff;
      }
    });
    
    console.log('🔄 DiffManager: Generated diff map with', Object.keys(diffMap).length, 'entries');
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
