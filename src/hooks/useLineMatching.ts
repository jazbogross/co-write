
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';
import { findBestMatchingLine } from '@/utils/lineMatching';

export const useLineMatching = (userId: string | null) => {
  const matchAndAssignLines = useCallback((
    newContents: string[],
    prevData: LineData[],
    contentToUuidMap: Map<string, string>,
    domUuidMap: Map<number, string>,
    quill: any
  ) => {
    const usedIndices = new Set<number>();
    const newData: LineData[] = [];
    const stats = {
      preserved: 0,
      regenerated: 0,
      matchStrategy: {} as Record<string, number>
    };
    
    for (let i = 0; i < newContents.length; i++) {
      const content = newContents[i];
      
      const match = findBestMatchingLine(
        content, 
        i, 
        prevData, 
        usedIndices, 
        contentToUuidMap,
        true, 
        domUuidMap
      );
      
      if (match) {
        const matchIndex = match.index;
        usedIndices.add(matchIndex);
        
        const strategy = match.matchStrategy;
        stats.matchStrategy[strategy] = 
          (stats.matchStrategy[strategy] || 0) + 1;
        
        stats.preserved++;
        
        const existingLine = prevData[matchIndex];
        newData.push({
          ...existingLine,
          lineNumber: i + 1,
          content,
          editedBy: content !== existingLine.content && userId && 
                   !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        });
        
        contentToUuidMap.set(content, existingLine.uuid);
        
        if (quill && quill.lineTracking) {
          quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
        }
      } else {
        stats.regenerated++;
        
        const newUuid = crypto.randomUUID();
        newData.push({
          uuid: newUuid,
          lineNumber: i + 1,
          content,
          originalAuthor: userId,
          editedBy: []
        });
        
        contentToUuidMap.set(content, newUuid);
        
        if (quill && quill.lineTracking) {
          quill.lineTracking.setLineUuid(i + 1, newUuid);
        }
      }
    }
    
    return { newData, stats };
  }, [userId]);

  return { matchAndAssignLines };
};
