
/**
 * DiffManager.ts - Manages diffs between original content and suggestions
 */
import { LineData } from '@/types/lineTypes';
import { generateLineDiff, LineDiff } from './contentDiff';
import { LineDiffMap, ChangedLine, DiffSummary } from './diffManagerTypes';
import { groupConsecutiveChanges } from './lineGrouping';
import { detectFormattingChanges } from './changeDetection';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

export class DiffManager {
  /**
   * Generate diff between original lines and suggested content
   */
  static generateDiff(originalLines: LineData[], suggestedLines: LineData[]): LineDiffMap {
    console.log("🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠🟠 Generating Diff Map");
    const diffMap: LineDiffMap = {};
    const originalLineMap = new Map(originalLines.map(line => [line.uuid, line]));

    suggestedLines.forEach((suggestedLine) => {
        if (!suggestedLine.uuid) return; // Skip if no UUID

        const originalLine = originalLineMap.get(suggestedLine.uuid);
        
        console.log("🟡 Debug - Checking line:", {
            uuid: suggestedLine.uuid,
            originalContent: originalLine?.content,
            suggestedContent: suggestedLine.content
        });

        // Normalize content for comparison
        const normalizeContent = (content: any): string => {
            if (content == null) return "";
            
            if (typeof content === 'string') {
                try {
                    // Check if it's stringified JSON/Delta
                    const parsed = JSON.parse(content);
                    if (parsed && typeof parsed === 'object' && 'ops' in parsed) {
                        return extractPlainTextFromDelta(parsed);
                    }
                } catch (e) {
                    // Not JSON, use as is
                    return content;
                }
                return content;
            } else if (isDeltaObject(content)) {
                return extractPlainTextFromDelta(content);
            }
            return String(content);
        };

        const normalizedOriginal = normalizeContent(originalLine?.content);
        const normalizedSuggested = normalizeContent(suggestedLine.content);

        // Only generate diff if content actually differs
        if (!originalLine || normalizedOriginal !== normalizedSuggested) {
            console.log("🔴 Change Detected - Calling generateLineDiff() for:", {
                uuid: suggestedLine.uuid,
                original: normalizedOriginal || "(empty)",
                modified: normalizedSuggested
            });

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

      console.log(`🟠 Processing Changed Line: ${lineUuid}`, {
          changeType: diff.changeType,
          originalContent: originalLines.find(line => line.uuid === lineUuid)?.content,
          suggestedContent: suggestedLines.find(line => line.uuid === lineUuid)?.content
      });
    
      // Find the corresponding line data
      const originalLine = originalLines.find(line => line.uuid === lineUuid);
      const suggestedLine = suggestedLines.find(line => line.uuid === lineUuid);
    
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
