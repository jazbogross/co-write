
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
    
    // Get operation context if available
    const lastOperation = quill?.lineTracking?.getLastOperation() || null;
    const enterAtZeroOperation = lastOperation?.type === 'enter-at-position-0' ? lastOperation : null;
    
    if (enterAtZeroOperation) {
      console.log(`**** useLineMatching **** Found Enter-at-position-0 operation at line ${enterAtZeroOperation.lineIndex + 1}`);
    }
    
    // First pass: match all non-empty lines to preserve content UUIDs
    for (let i = 0; i < newContents.length; i++) {
      const content = newContents[i];
      const wasEmpty = i < prevData.length && (!prevData[i].content || !prevData[i].content.trim());
      const isEmpty = !content || !content.trim();
      
      // Special handling for Enter at position 0 case
      if (enterAtZeroOperation) {
        const emptyLineIndex = enterAtZeroOperation.lineIndex;
        const contentLineIndex = emptyLineIndex + 1;
        
        // If this is the newly inserted empty line
        if (i === emptyLineIndex && isEmpty) {
          // Generate new UUID for the empty line
          const newUuid = crypto.randomUUID();
          newData[i] = {
            uuid: newUuid,
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          };
          
          if (quill?.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, newUuid);
          }
          
          stats.regenerated++;
          continue;
        }
        
        // If this is the moved content line that was at position 0
        if (i === contentLineIndex && content === enterAtZeroOperation.movedContent) {
          // Find the original UUID from the previous data at the operation's line index
          if (enterAtZeroOperation.lineIndex < prevData.length) {
            const originalLine = prevData[enterAtZeroOperation.lineIndex];
            usedIndices.add(enterAtZeroOperation.lineIndex);
            
            stats.preserved++;
            stats.matchStrategy['enter-moved-content'] = 
              (stats.matchStrategy['enter-moved-content'] || 0) + 1;
            
            newData[i] = {
              ...originalLine,
              lineNumber: i + 1,
              content,
              editedBy: content !== originalLine.content && userId && 
                       !originalLine.editedBy.includes(userId)
                ? [...originalLine.editedBy, userId]
                : originalLine.editedBy
            };
            
            // Update mapping
            contentToUuidMap.set(content, originalLine.uuid);
            
            if (quill?.lineTracking) {
              quill.lineTracking.setLineUuid(i + 1, originalLine.uuid);
            }
            
            continue;
          }
        }
      }
      
      // Skip empty lines in first pass
      if (isEmpty) {
        newData[i] = null as any;
        continue;
      }

      const match = findBestMatchingLine(
        content,
        i,
        prevData,
        usedIndices,
        contentToUuidMap,
        false,
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
    }
    
    // Second pass: handle empty lines and unmatched content
    for (let i = 0; i < newContents.length; i++) {
      if (!newData[i]) {
        const content = newContents[i];
        const isEmpty = !content || !content.trim();
        
        // For empty lines, try to find if they existed before
        const match = isEmpty ? 
          findBestMatchingLine(
            content,
            i,
            prevData,
            usedIndices,
            contentToUuidMap,
            false, // Don't use position fallback for empty lines
            domUuidMap
          ) : 
          findBestMatchingLine(
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
      }
    }

    return { newData, stats };
  }, [userId]);

  return { matchAndAssignLines };
};
