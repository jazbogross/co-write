
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
    
    // First pass: match all non-empty lines to preserve content UUIDs
    for (let i = 0; i < newContents.length; i++) {
      const content = newContents[i];
      if (content && content.trim() !== '') {
        // Only process non-empty lines in first pass
        const match = findBestMatchingLine(
          content, 
          i, 
          prevData, 
          usedIndices, 
          contentToUuidMap,
          false, // No position fallback in first pass
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
        } else {
          // If no match found, leave a gap for the second pass
          newData[i] = null as any;
        }
      } else {
        // Empty line - leave for second pass
        newData[i] = null as any;
      }
    }
    
    // Second pass: fill in any empty lines or unfilled slots
    for (let i = 0; i < newContents.length; i++) {
      if (!newData[i]) {
        const content = newContents[i];
        
        // Try to find a match again, this time with position-based fallback enabled
        const match = findBestMatchingLine(
          content, 
          i, 
          prevData, 
          usedIndices, 
          contentToUuidMap,
          true, // Use position fallback
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
          newData[i] = {
            ...existingLine,
            lineNumber: i + 1,
            content,
            editedBy: content !== existingLine.content && userId && 
                    !existingLine.editedBy.includes(userId)
              ? [...existingLine.editedBy, userId]
              : existingLine.editedBy
          };
          
          contentToUuidMap.set(content, existingLine.uuid);
          
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
          }
        } else {
          // No match found - create a new line with new UUID
          stats.regenerated++;
          
          const newUuid = crypto.randomUUID();
          newData[i] = {
            uuid: newUuid,
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          };
          
          contentToUuidMap.set(content, newUuid);
          
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, newUuid);
          }
        }
      }
    }
    
    // Ensure we maintain the content to UUID mapping
    for (let i = 0; i < newData.length; i++) {
      const line = newData[i];
      if (line && line.content && line.content.trim() !== '') {
        contentToUuidMap.set(line.content, line.uuid);
      }
    }
    
    return { newData, stats };
  }, [userId]);

  return { matchAndAssignLines };
};
