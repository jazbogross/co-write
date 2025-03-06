
/**
 * diffTestUtils.ts - Utilities for testing diff functionality
 */
import { LineDiff, DiffSegment } from './contentDiff';
import { DiffManager } from './DiffManager';
import { ChangedLine } from './diffManagerTypes';
import { LineData } from '@/types/lineTypes';

/**
 * Format a diff for console output
 */
export const logFormattedDiff = (diff: LineDiff): void => {
  console.log('Diff:');
  console.log(`Original: "${diff.originalContent}"`);
  console.log(`Suggested: "${diff.suggestedContent}"`);
  console.log(`Change type: ${diff.changeType}`);
  
  console.log('Segments:');
  diff.segments.forEach((segment, i) => {
    console.log(`  ${i+1}. [${segment.type}] "${segment.content}"`);
  });
};

/**
 * Simulate applying the diff to the original content to verify correctness
 */
export const applyDiff = (diff: LineDiff): string => {
  let result = '';
  
  diff.segments.forEach(segment => {
    if (segment.type !== 'deletion') {
      result += segment.content;
    }
  });
  
  return result;
};

/**
 * Test if applying the diff results in the expected content
 */
export const validateDiff = (diff: LineDiff): boolean => {
  const result = applyDiff(diff);
  return result === diff.suggestedContent;
};

/**
 * Convert LineData arrays to an example for testing
 */
export const createDiffExample = (originalLines: LineData[], suggestedLines: LineData[]): void => {
  const diffMap = DiffManager.generateDiff(originalLines, suggestedLines);
  const summary = DiffManager.generateDiffSummary(originalLines, suggestedLines);
  
  console.log('======= DIFF EXAMPLE =======');
  console.log(`Total changes: ${summary.totalChanges}`);
  console.log(`Additions: ${summary.additions}`);
  console.log(`Deletions: ${summary.deletions}`);
  console.log(`Modifications: ${summary.modifications}`);
  
  console.log('\nChanged lines:');
  summary.changedLines.forEach((line, i) => {
    console.log(`\n--- Change ${i+1} (Line ${line.lineNumber}) ---`);
    logFormattedDiff(line.diff);
    
    const valid = validateDiff(line.diff);
    console.log(`Validation: ${valid ? 'PASSED' : 'FAILED'}`);
  });
  
  console.log('\nConsecutive groups:');
  const groups = DiffManager.groupConsecutiveChanges(summary.changedLines);
  groups.forEach((group, i) => {
    console.log(`Group ${i+1}: Lines ${group[0].lineNumber}-${group[group.length-1].lineNumber} (${group.length} lines)`);
  });
  
  console.log('==========================');
};
