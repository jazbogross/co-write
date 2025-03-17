
export interface DiffChange {
  type: 'add' | 'delete' | 'equal' | 'modify';
  text: string;
  index: number;
  lineNumber?: number;
  originalText?: string;
}

export interface LineDiff {
  original: string;
  suggested: string;
  changeType: 'unchanged' | 'addition' | 'deletion' | 'modification';
  segments: {
    type: 'unchanged' | 'addition' | 'deletion';
    content: string;
  }[];
}

/**
 * Simple diff generator function
 */
export function generateDiff(originalText: string, newText: string): DiffChange[] {
  if (originalText === newText) {
    return [{ type: 'equal', text: originalText, index: 0 }];
  }
  
  // Super simple implementation - in real app would use proper diff library
  return [
    { 
      type: 'modify', 
      text: newText, 
      index: 0,
      originalText: originalText
    }
  ];
}
