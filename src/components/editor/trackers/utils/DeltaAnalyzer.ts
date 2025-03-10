/**
 * DeltaAnalyzer.ts - Analyzes delta changes to determine operation types
 */

export enum LineOperationType {
  SPLIT = 'split',
  NEW = 'new',
  MERGE = 'merge',
  DELETE = 'delete',
  MODIFY = 'modify',
  ENTER_AT_ZERO = 'enter-at-position-0'
}

export interface OperationAnalysis {
  operationType: LineOperationType;
  affectedLineIndex: number;
}

export class DeltaAnalyzer {
  /**
   * Detect if the delta represents a structural change (i.e. line added or removed).
   */
  public static detectStructuralChange(delta: any): boolean {
    if (!delta || !delta.ops) return false;
    
    for (const op of delta.ops) {
      if (op.insert && typeof op.insert === 'string' && op.insert.includes('\n')) {
        return true;
      }
      if (op.delete && op.delete > 1) {
        return true;
      }
    }
    return false;
  }

  /**
   * Detect the special case of Enter at position 0
   */
  public static detectEnterAtZero(delta: any, affectedLineIndex: number): boolean {
    // Special case: Enter at index 0 creates a new empty line at the beginning
    if (affectedLineIndex === 0 && delta.ops) {
      for (const op of delta.ops) {
        if (op.insert === '\n' && op.retain === undefined) {
          return true;
        }
      }
    }
    return false;
  }
  
  /**
   * Analyze the type of structural change with more detail.
   * Returns the operation type and the affected line index.
   */
  public static analyzeStructuralChangeDetailed(delta: any, currentLineCount: number, lastLineCount: number, quill: any): OperationAnalysis {
    if (!delta || !delta.ops) {
      return { 
        operationType: LineOperationType.MODIFY, 
        affectedLineIndex: -1 
      };
    }
    
    let affectedLineIndex = -1;
    let operationType = LineOperationType.MODIFY;
    
    // Try to determine which line was affected based on delta
    const selection = quill.getSelection();
    if (selection) {
      // Find the line index based on selection
      const lines = quill.getLines(0, selection.index);
      affectedLineIndex = lines.length - 1;
    }
    
    // Check for enter at position 0 (new line at beginning)
    const isEnterAtZero = this.detectEnterAtZero(delta, affectedLineIndex);
    if (isEnterAtZero) {
      return { 
        operationType: LineOperationType.ENTER_AT_ZERO, 
        affectedLineIndex: 0 
      };
    }
    
    if (currentLineCount > lastLineCount) {
      // Find which operation added lines
      let wasExactNewlineInsert = false;
      
      for (const op of delta.ops) {
        if (op.insert && typeof op.insert === 'string') {
          if (op.insert === '\n') {
            // This is a pure newline insertion (pressing Enter) -> split
            operationType = LineOperationType.SPLIT;
            wasExactNewlineInsert = true;
          } else if (op.insert.includes('\n')) {
            // This contains newlines along with other content -> new content
            operationType = LineOperationType.NEW;
          }
        }
      }
      
      // If we couldn't determine precisely, use a fallback
      if (!wasExactNewlineInsert && operationType !== LineOperationType.NEW) {
        operationType = LineOperationType.NEW;
      }
    } else if (currentLineCount < lastLineCount) {
      let hasDelete = false;
      
      for (const op of delta.ops) {
        if (op.delete) {
          hasDelete = true;
          break;
        }
      }
      
      // If delta contains delete operation, mark as delete
      // Otherwise, it's likely a merge (e.g., backspace at start of line)
      operationType = hasDelete ? LineOperationType.DELETE : LineOperationType.MERGE;
    }
    
    return { operationType, affectedLineIndex };
  }
}
