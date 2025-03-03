
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { 
  handleEnterAtZeroOperation,
  matchNonEmptyLines,
  matchWithPositionFallback,
  isContentEmpty
} from '@/utils/lineMatching';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

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
    const stats = {
      preserved: 0,
      regenerated: 0,
      matchStrategy: {} as Record<string, number>
    };
    
    // Get operation context if available
    const lastOperation = quill?.lineTracking?.getLastOperation() || null;
    const enterAtZeroOperation = lastOperation?.type === 'enter-at-position-0' ? lastOperation : null;
    
    if (enterAtZeroOperation) {
      console.log(`**** useLineMatching **** Found Enter-at-position-0 operation at line ${enterAtZeroOperation.lineIndex + 1}`);
      console.log(`**** useLineMatching **** Moved content: "${enterAtZeroOperation.movedContent}"`);
    }
    
    // Ensure every content item is safely processed
    const safeNewContents = newContents.map(content => {
      // If content is a Delta object, extract plain text
      if (isDeltaObject(content)) {
        return extractPlainTextFromDelta(content);
      }
      return content;
    });
    
    // Step 1: Special handling for Enter at position 0
    if (enterAtZeroOperation) {
      const emptyLineIndex = enterAtZeroOperation.lineIndex;
      const contentLineIndex = emptyLineIndex + 1;
      
      const result = handleEnterAtZeroOperation(
        emptyLineIndex,
        contentLineIndex,
        safeNewContents,
        prevData,
        usedIndices,
        userId,
        quill
      );
      
      if (result.success) {
        // Update stats
        stats.preserved += result.stats.preserved;
        stats.regenerated += result.stats.regenerated;
        Object.entries(result.stats.matchStrategy).forEach(([key, value]) => {
          stats.matchStrategy[key] = (stats.matchStrategy[key] || 0) + value;
        });
        
        // Assign the empty line data
        if (result.emptyLineData) {
          newData[emptyLineIndex] = result.emptyLineData;
        }
        
        // Assign the content line data
        if (result.contentLineData) {
          newData[contentLineIndex] = result.contentLineData;
          
          // Update content-to-UUID mapping
          contentToUuidMap.set(safeNewContents[contentLineIndex], result.contentLineData.uuid);
        }
        
        console.log(`**** useLineMatching **** Successfully handled Enter-at-position-0 operation`);
      } else {
        console.log(`**** useLineMatching **** Failed to handle Enter-at-position-0 operation`);
      }
    }
    
    // Step 2: Match non-empty lines with content matching strategies
    for (let i = 0; i < safeNewContents.length; i++) {
      // Skip lines already handled
      if (newData[i]) continue;
      
      const content = safeNewContents[i];
      const isEmpty = isContentEmpty(content);
      
      // Skip empty lines in this pass
      if (isEmpty) continue;
      
      const { match, stats: lineStats } = matchNonEmptyLines(
        content,
        i,
        prevData,
        usedIndices,
        contentToUuidMap,
        domUuidMap
      );
      
      // Update global stats
      stats.preserved += lineStats.preserved;
      stats.regenerated += lineStats.regenerated;
      Object.entries(lineStats.matchStrategy).forEach(([key, value]) => {
        stats.matchStrategy[key] = (stats.matchStrategy[key] || 0) + value;
      });
      
      if (match) {
        const matchIndex = match.index;
        usedIndices.add(matchIndex);
        
        const existingLine = prevData[matchIndex];
        newData[i] = {
          ...existingLine,
          lineNumber: i + 1,
          content,
          editedBy: content !== existingLine.content && userId && 
                   !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        };
        
        // Update content-to-UUID mapping
        contentToUuidMap.set(content, existingLine.uuid);
        
        if (quill && quill.lineTracking) {
          quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
        }
      }
    }
    
    // Step 3: Handle empty lines and unmatched content with position-based fallback
    for (let i = 0; i < safeNewContents.length; i++) {
      if (newData[i]) continue;
      
      const content = safeNewContents[i];
      const isEmpty = isContentEmpty(content);
      
      try {
        // For unmatched lines, try more aggressive matching strategies
        const { match, stats: lineStats } = matchWithPositionFallback(
          content,
          i,
          prevData,
          usedIndices,
          domUuidMap
        );
        
        // Update global stats
        stats.preserved += lineStats.preserved;
        stats.regenerated += lineStats.regenerated;
        Object.entries(lineStats.matchStrategy).forEach(([key, value]) => {
          stats.matchStrategy[key] = (stats.matchStrategy[key] || 0) + value;
        });
        
        if (match) {
          const matchIndex = match.index;
          usedIndices.add(matchIndex);
          
          const existingLine = prevData[matchIndex];
          newData[i] = {
            ...existingLine,
            lineNumber: i + 1,
            content,
            editedBy: content !== existingLine.content && userId && 
                     !existingLine.editedBy.includes(userId)
              ? [...existingLine.editedBy, userId]
              : existingLine.editedBy
          };
          
          if (!isEmpty) {
            contentToUuidMap.set(content, existingLine.uuid);
          }
          
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
          }
        } else {
          // Generate new UUID for unmatched lines
          stats.regenerated++;
          const newUuid = crypto.randomUUID();
          newData[i] = {
            uuid: newUuid,
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          };
          
          if (!isEmpty) {
            contentToUuidMap.set(content, newUuid);
          }
          
          if (quill?.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, newUuid);
          }
        }
      } catch (error) {
        console.error('Error in line matching:', error);
        
        // Fallback: Generate new UUID for lines that caused errors
        stats.regenerated++;
        const newUuid = crypto.randomUUID();
        newData[i] = {
          uuid: newUuid,
          lineNumber: i + 1,
          content: typeof content === 'string' ? content : '',
          originalAuthor: userId,
          editedBy: []
        };
        
        if (quill?.lineTracking) {
          quill.lineTracking.setLineUuid(i + 1, newUuid);
        }
      }
    }

    return { newData, stats };
  }, [userId]);

  return { matchAndAssignLines };
};
