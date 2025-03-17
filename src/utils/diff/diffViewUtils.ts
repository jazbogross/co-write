import { DiffChange } from '@/utils/diff';

export interface ContextLine {
  lineNumber: number;
  text: string;
  type: 'context' | 'deleted' | 'added';
  originalLineNumber?: number;
  suggestedLineNumber?: number;
}

/**
 * Processes diff changes and ensures they have proper line numbers with running offsets
 */
export function getAdjustedDiffChanges(diffChanges: DiffChange[]): DiffChange[] {
  // Sort changes by original line number to ensure proper processing order
  const sortedChanges = [...diffChanges].sort((a, b) => {
    return (a.originalLineNumber || 0) - (b.originalLineNumber || 0);
  });

  let lineOffset = 0; // Track cumulative line number changes
  
  return sortedChanges.map((change) => {
    // For each change, calculate the correct line numbers with running offset
    if (change.type === 'add') {
      // Added lines increase line count
      const adjustedChange = {
        ...change,
        suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
      };
      lineOffset += 1;
      return adjustedChange;
    } else if (change.type === 'delete') {
      // Deleted lines decrease line count
      const adjustedChange = {
        ...change,
        suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
      };
      lineOffset -= 1;
      return adjustedChange;
    } else if (change.type === 'modify') {
      // Modified lines keep the same count
      return {
        ...change,
        originalLineNumber: change.originalLineNumber,
        suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
      };
    } else {
      // Equal lines maintain the offset
      return {
        ...change,
        originalLineNumber: change.originalLineNumber,
        suggestedLineNumber: (change.originalLineNumber || 0) + lineOffset
      };
    }
  });
}

/**
 * Generates context lines for a single change
 */
export function getContextLinesForChange(
  change: DiffChange & { originalLineNumber?: number; suggestedLineNumber?: number },
  originalLines: string[],
  suggestedLines: string[]
): ContextLine[] {
  // Determine which content and line number to use as reference
  let refIndex: number;
  let source: string[];
  
  if (change.type === 'add') {
    // For additions, reference the suggested line number in suggested content
    refIndex = (change.suggestedLineNumber || 0) - 1;
    source = suggestedLines;
  } else {
    // For deletions/modifications, reference the original line number in original content
    refIndex = (change.originalLineNumber || 0) - 1;
    source = originalLines;
  }
  
  // Ensure we stay within bounds when getting context
  const startIndex = Math.max(0, refIndex - 1);
  const endIndex = Math.min(source.length - 1, refIndex + 1);
  const contextLines: ContextLine[] = [];

  // Add line before (context)
  if (refIndex > 0) {
    contextLines.push({
      lineNumber: startIndex + 1,
      text: source[startIndex],
      type: 'context',
      originalLineNumber: source === originalLines ? startIndex + 1 : undefined,
      suggestedLineNumber: source === suggestedLines ? startIndex + 1 : undefined,
    });
  }

  // Add the actual change
  if (change.type === 'delete' || change.type === 'modify') {
    contextLines.push({
      lineNumber: change.originalLineNumber || 0,
      text: change.originalText || '',
      type: 'deleted',
      originalLineNumber: change.originalLineNumber,
    });
  }
  
  if (change.type === 'add' || change.type === 'modify') {
    contextLines.push({
      lineNumber: change.suggestedLineNumber || 0,
      text: change.text,
      type: 'added',
      suggestedLineNumber: change.suggestedLineNumber,
    });
  }

  // Add line after (context)
  if (refIndex < source.length - 1) {
    contextLines.push({
      lineNumber: endIndex + 1,
      text: source[endIndex],
      type: 'context',
      originalLineNumber: source === originalLines ? endIndex + 1 : undefined,
      suggestedLineNumber: source === suggestedLines ? endIndex + 1 : undefined,
    });
  }

  return contextLines;
}

/**
 * Collects and processes all context lines from diff changes
 */
export function getAllContextWithChanges(
  adjustedChanges: DiffChange[],
  originalContent: string,
  suggestedContent: string
): ContextLine[] {
  const originalLines = originalContent.split('\n');
  const suggestedLines = suggestedContent.split('\n');
  let allContextLines: ContextLine[] = [];

  // Process each change to get context lines
  adjustedChanges.forEach(change => {
    const contextForChange = getContextLinesForChange(change, originalLines, suggestedLines);
    
    // Add context lines, avoiding duplicates
    contextForChange.forEach(line => {
      // Check if this line is already in our collection to avoid duplicates
      const exists = allContextLines.some(existing => {
        if (line.type === 'deleted') {
          return existing.originalLineNumber === line.originalLineNumber && existing.type === 'deleted';
        } else if (line.type === 'added') {
          return existing.suggestedLineNumber === line.suggestedLineNumber && existing.type === 'added';
        }
        // For context lines, check both number and content to avoid duplicating context
        return (existing.lineNumber === line.lineNumber && 
               existing.type === line.type && 
               existing.text === line.text);
      });
      
      if (!exists) {
        allContextLines.push(line);
      }
    });
  });

  // Sort all lines for display
  allContextLines.sort((a, b) => {
    // Determine display numbers for sorting
    const aNum =
      a.type === 'deleted'
        ? a.originalLineNumber || 0
        : a.type === 'added'
        ? a.suggestedLineNumber || 0
        : a.lineNumber;
    const bNum =
      b.type === 'deleted'
        ? b.originalLineNumber || 0
        : b.type === 'added'
        ? b.suggestedLineNumber || 0
        : b.lineNumber;
    
    return aNum - bNum;
  });
  
  return allContextLines;
}
