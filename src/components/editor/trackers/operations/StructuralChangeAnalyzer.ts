
/**
 * StructuralChangeAnalyzer.ts - Analyzes structural changes in delta operations
 */

import { LineOperationType, DeltaAnalyzer } from '../utils/DeltaAnalyzer';

export class StructuralChangeAnalyzer {
  /**
   * Detect if a change requires structural handling
   */
  public static needsStructuralHandling(
    delta: any,
    currentLineCount: number,
    lastLineCount: number
  ): boolean {
    return DeltaAnalyzer.detectStructuralChange(delta) || 
           currentLineCount !== lastLineCount;
  }
  
  /**
   * Handle structural changes detection and analysis
   */
  public static analyzeChange(
    delta: any,
    currentLineCount: number,
    lastLineCount: number,
    quill: any
  ): { operationType: LineOperationType, affectedLineIndex: number } {
    console.log('**** StructuralChangeAnalyzer **** Analyzing structural change');
    
    const { operationType, affectedLineIndex } = DeltaAnalyzer.analyzeStructuralChangeDetailed(
      delta, 
      currentLineCount, 
      lastLineCount,
      quill
    );
    
    console.log(`**** StructuralChangeAnalyzer **** Operation type detected: ${operationType} at line ${affectedLineIndex + 1}`);
    
    return { operationType, affectedLineIndex };
  }
}
