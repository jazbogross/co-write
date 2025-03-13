
import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

/**
 * Strategy for matching lines when content changes in non-empty lines
 */
export const nonEmptyLineStrategy = {
  /**
   * Detects if this strategy applies to the current operation
   */
  applies: (index: number, operation: any): boolean => {
    return true; // Default fallback strategy
  },
  
  /**
   * Updates line data based on this strategy
   */
  updateLines: (lines: LineData[], prevLines: LineData[]): LineData[] => {
    // In the Delta-based approach, this isn't necessary
    return lines;
  }
};
