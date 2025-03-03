
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { 
  handleSpecialOperations,
  matchNonEmptyLines,
  matchRemainingLines,
  generateStatsTemplate
} from '@/hooks/lineMatching';
import { isContentEmpty, getPlainTextContent } from '@/hooks/lineMatching/contentUtils';

export const useLineMatching = (userId: string | null) => {
  const matchAndAssignLines = useCallback((
    newContents: any[],
    prevData: LineData[],
    contentToUuidMap: Map<string, string>,
    domUuidMap: Map<number, string>,
    quill: any
  ) => {
    const usedIndices = new Set<number>();
    const newData: LineData[] = Array(newContents.length).fill(null);
    const stats = generateStatsTemplate();
    
    // Get operation context if available
    const lastOperation = quill?.lineTracking?.getLastOperation() || null;
    const enterAtZeroOperation = lastOperation?.type === 'enter-at-position-0' ? lastOperation : null;
    
    if (enterAtZeroOperation) {
      console.log(`**** useLineMatching **** Found Enter-at-position-0 operation at line ${enterAtZeroOperation.lineIndex + 1}`);
      console.log(`**** useLineMatching **** Moved content: "${enterAtZeroOperation.movedContent}"`);
    }
    
    // Ensure every content item is safely processed
    const safeNewContents = newContents.map(content => {
      // This function only extracts plain text for operations like comparison
      // It doesn't replace the actual Delta objects
      return content;
    });
    
    // Step 1: Special handling for Enter at position 0
    if (enterAtZeroOperation) {
      const result = handleSpecialOperations(
        enterAtZeroOperation,
        safeNewContents,
        prevData,
        usedIndices,
        userId,
        quill
      );
      
      if (result.success) {
        // Update stats
        Object.assign(stats, result.stats);
        
        // Assign the empty line data
        if (result.emptyLineData) {
          newData[result.emptyLineIndex] = result.emptyLineData;
        }
        
        // Assign the content line data
        if (result.contentLineData) {
          newData[result.contentLineIndex] = result.contentLineData;
          
          // Update content-to-UUID mapping
          const plainTextContent = getPlainTextContent(safeNewContents[result.contentLineIndex]);
          contentToUuidMap.set(plainTextContent, result.contentLineData.uuid);
        }
        
        console.log(`**** useLineMatching **** Successfully handled Enter-at-position-0 operation`);
      } else {
        console.log(`**** useLineMatching **** Failed to handle Enter-at-position-0 operation`);
      }
    }
    
    // Step 2: Match non-empty lines with content matching strategies
    matchNonEmptyLines(
      safeNewContents,
      prevData,
      usedIndices,
      newData,
      contentToUuidMap,
      domUuidMap,
      quill,
      stats,
      userId
    );
    
    // Step 3: Handle empty lines and unmatched content with position-based fallback
    matchRemainingLines(
      safeNewContents,
      prevData,
      usedIndices,
      newData,
      contentToUuidMap,
      domUuidMap,
      quill,
      stats,
      userId
    );

    return { newData, stats };
  }, [userId]);

  return { matchAndAssignLines };
};

