/**
 * DiffManager.ts - Manages diffs between original content and suggestions
 */
import { LineData } from '@/types/lineTypes';
import { generateLineDiff, LineDiff, DiffChangeType } from './contentDiff';
import { DeltaContent } from '@/utils/editor/types';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

export interface LineDiffMap {
  [lineUuid: string]: LineDiff;
}

export interface ChangedLine {
  lineUuid: string;
  lineNumber: number;
  originalContent: string | DeltaContent;
  suggestedContent: string | DeltaContent;
  diff: LineDiff;
}

export interface DiffSummary {
  totalChanges: number;
  additions: number;
  deletions: number;
  modifications: number;
  changedLines: ChangedLine[];
}

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
  
  /**
   * Group changes by consecutive line numbers for UI grouping
   */
  static groupConsecutiveChanges(changedLines: ChangedLine[]): ChangedLine[][] {
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
  
  /**
   * Detect formatting changes in a Delta object
   * This requires more complex logic to compare Delta attributes
   */
  static detectFormattingChanges(original: any, suggested: any): boolean {
    // Simple string content doesn't have formatting
    if (typeof original === 'string' && typeof suggested === 'string') {
      return false;
    }
    
    // If one is Delta and other is string, format definitely changed
    if ((isDeltaObject(original) && typeof suggested === 'string') ||
        (typeof original === 'string' && isDeltaObject(suggested))) {
      return true;
    }
    
    // If both are Deltas, we need to compare attributes
    if (isDeltaObject(original) && isDeltaObject(suggested)) {
      // This is a simplified check - a real implementation would need to compare 
      // attributes across operations more carefully
      const originalDelta = original as DeltaContent;
      const suggestedDelta = suggested as DeltaContent;
      
      if (!originalDelta.ops || !suggestedDelta.ops) return false;
      
      // Simple check: compare ops length
      if (originalDelta.ops.length !== suggestedDelta.ops.length) {
        return true;
      }
      
      // Compare attributes on each op
      for (let i = 0; i < originalDelta.ops.length; i++) {
        const origOp = originalDelta.ops[i];
        const suggOp = suggestedDelta.ops[i];
        
        // If inserts differ, content changed (not just formatting)
        if (typeof origOp.insert === 'string' && 
            typeof suggOp.insert === 'string' && 
            origOp.insert !== suggOp.insert) {
          continue;
        }
        
        // Check if attributes differ
        const origAttrs = JSON.stringify(origOp.attributes || {});
        const suggAttrs = JSON.stringify(suggOp.attributes || {});
        
        if (origAttrs !== suggAttrs) {
          return true;
        }
      }
    }
    
    return false;
  }
}
