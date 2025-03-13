
import { LineData } from '@/types/lineTypes';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

/**
 * Strategy for matching lines when Enter is pressed at the beginning of a line
 */
export const enterAtZeroStrategy = {
  /**
   * Detects if this strategy applies to the current operation
   */
  applies: (index: number, operation: any): boolean => {
    return (
      operation && 
      operation.type === 'insert' && 
      operation.index === 0 && 
      operation.text === '\n'
    );
  },
  
  /**
   * Updates line data based on this strategy
   */
  updateLines: (lines: LineData[], prevLines: LineData[]): LineData[] => {
    // In the Delta-based approach, this isn't necessary
    return lines;
  }
};
