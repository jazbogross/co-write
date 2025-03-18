
import React from 'react';
import { DiffChange } from '@/utils/diff';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  getAdjustedDiffChanges, 
  getAllContextWithChanges
} from '@/utils/diff/diffViewUtils';
import { DiffLine } from '@/components/editor/DiffLine';

interface SuggestionDiffViewProps {
  originalContent: string;
  suggestedContent: string;
  diffChanges: DiffChange[];
  lineNumber?: number;
}

export const SuggestionDiffView: React.FC<SuggestionDiffViewProps> = ({
  originalContent,
  suggestedContent,
  diffChanges,
}) => {
  // Step 1: Process diff changes and ensure they have proper line numbers
  const adjustedChanges = getAdjustedDiffChanges(diffChanges);

  // Step 2: Collect all context lines from each diff change
  const contextWithChanges = getAllContextWithChanges(
    adjustedChanges,
    originalContent,
    suggestedContent
  );

  // Step 3: Render the diff with proper line numbers and visual separators
  return (
    <div className="border rounded-md overflow-hidden">
      <ScrollArea className="h-[400px]">
        <div className="font-mono text-sm p-1">
          {contextWithChanges.map((line, index) => (
            <DiffLine
              key={index}
              line={line}
              previousLine={index > 0 ? contextWithChanges[index - 1] : undefined}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
