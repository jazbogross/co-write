
import React from 'react';
import { ContextLine } from '@/utils/diff/diffViewUtils';

interface DiffLineProps {
  line: ContextLine;
  previousLine?: ContextLine;
}

export const DiffLine: React.FC<DiffLineProps> = ({ line, previousLine }) => {
  // Determine display number based on type
  const displayNumber = 
    line.type === 'deleted' 
      ? line.originalLineNumber || 0
      : line.type === 'added'
      ? line.suggestedLineNumber || 0
      : line.lineNumber;
  
  // Check for gaps in line numbers to insert a visual separator
  let hasGap = false;
  
  if (previousLine) {
    const prevNumber =
      previousLine.type === 'deleted'
        ? previousLine.originalLineNumber || 0
        : previousLine.type === 'added'
        ? previousLine.suggestedLineNumber || 0
        : previousLine.lineNumber;
        
    // Consider a gap if line numbers aren't sequential
    // but account for add/delete pairs that may have same number
    const isPrevDeleteCurrentAdd = previousLine.type === 'deleted' && line.type === 'added';
    
    if (!isPrevDeleteCurrentAdd && Math.abs(displayNumber - prevNumber) > 1) {
      hasGap = true;
    }
  }
  
  return (
    <React.Fragment>
      {hasGap && <div className="my-2 text-center text-white">...</div>}
      <div className="flex">
        <div className="w-10 text-white select-none tabular-nums">{displayNumber}</div>
        <div
          className={`whitespace-pre-wrap flex-1 ${
            line.type === 'deleted'
              ? 'bg-red-50 text-red-800 line-through'
              : line.type === 'added'
              ? 'bg-green-50 text-green-800'
              : 'text-white'
          }`}
        >
          {line.text}
        </div>
      </div>
    </React.Fragment>
  );
};
