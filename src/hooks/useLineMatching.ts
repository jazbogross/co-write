
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
    
    // Special handling for Enter at position 0
    // This must run BEFORE any other matching to ensure proper UUID assignment
    if (enterAtZeroOperation) {
      const emptyLineIndex = enterAtZeroOperation.lineIndex;
      const contentLineIndex = emptyLineIndex + 1;
      
      // Only proceed if both lines exist in the new content
      if (emptyLineIndex < newContents.length && contentLineIndex < newContents.length) {
        const emptyLineContent = newContents[emptyLineIndex];
        const movedContent = newContents[contentLineIndex];
        const isEmpty = !emptyLineContent || !emptyLineContent.trim();
        
        // Verify this is actually our operation by checking content patterns
        if (isEmpty && movedContent === enterAtZeroOperation.movedContent) {
          console.log(`**** useLineMatching **** Processing Enter-at-position-0 operation`);
          console.log(`**** useLineMatching **** Empty line at ${emptyLineIndex + 1}, moved content at ${contentLineIndex + 1}`);
          
          // 1. Generate new UUID for the empty line (emptyLineIndex)
          const emptyLineUuid = crypto.randomUUID();
          newData[emptyLineIndex] = {
            uuid: emptyLineUuid,
            lineNumber: emptyLineIndex + 1,
            content: emptyLineContent,
            originalAuthor: userId,
            editedBy: []
          };
          
          if (quill?.lineTracking) {
            quill.lineTracking.setLineUuid(emptyLineIndex + 1, emptyLineUuid);
          }
          
          // Mark this index as used
          usedIndices.add(emptyLineIndex);
          stats.regenerated++;
          stats.matchStrategy['enter-new-line'] = (stats.matchStrategy['enter-new-line'] || 0) + 1;
          
          // 2. Preserve UUID for the moved content line (contentLineIndex)
          // Find the line in previous data that matches the moved content
          if (enterAtZeroOperation.lineIndex < prevData.length) {
            const originalLine = prevData[enterAtZeroOperation.lineIndex];
            
            newData[contentLineIndex] = {
              ...originalLine,
              lineNumber: contentLineIndex + 1,
              content: movedContent,
              editedBy: movedContent !== originalLine.content && userId && 
                      !originalLine.editedBy.includes(userId)
                ? [...originalLine.editedBy, userId]
                : originalLine.editedBy
            };
            
            // Update mapping
            contentToUuidMap.set(movedContent, originalLine.uuid);
            
            if (quill?.lineTracking) {
              quill.lineTracking.setLineUuid(contentLineIndex + 1, originalLine.uuid);
            }
            
            // Mark this index as used
            usedIndices.add(enterAtZeroOperation.lineIndex);
            stats.preserved++;
            stats.matchStrategy['enter-moved-content'] = 
              (stats.matchStrategy['enter-moved-content'] || 0) + 1;
            
            console.log(`**** useLineMatching **** Enter-at-position-0 handled: new empty line UUID=${emptyLineUuid}, moved content UUID=${originalLine.uuid}`);
          }
        }
      }
    }
    
    // First pass: match all non-empty lines to preserve content UUIDs
    for (let i = 0; i < newContents.length; i++) {
      // Skip lines already handled by special cases
      if (newData[i]) continue;
      
      const content = newContents[i];
      const isEmpty = !content || !content.trim();
      
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
