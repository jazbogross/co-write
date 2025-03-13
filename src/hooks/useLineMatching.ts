
import { useCallback } from 'react';
import { LineData } from '@/types/lineTypes';

/**
 * Hook for matching lines between old and new content
 */
export const useLineMatching = (userId: string | null) => {
  /**
   * Matches and assigns UUIDs between old and new line data
   */
  const matchAndAssignLines = useCallback((
    oldLineData: LineData[],
    newContents: any[],
    quill: any
  ): LineData[] => {
    console.log('🔄 useLineMatching: matchAndAssignLines called');
    
    // In the simplified Delta approach, we mostly preserve the UUID
    // and just update the content
    if (oldLineData.length > 0 && newContents.length > 0) {
      return [{
        uuid: oldLineData[0].uuid,
        lineNumber: 1,
        content: newContents[0],
        originalAuthor: oldLineData[0].originalAuthor || userId,
        editedBy: (userId && oldLineData[0].editedBy && !oldLineData[0].editedBy.includes(userId))
          ? [...oldLineData[0].editedBy, userId]
          : oldLineData[0].editedBy || [],
        hasDraft: true
      }];
    }
    
    // Fallback if there's no previous data
    return newContents.map((content, index) => ({
      uuid: crypto.randomUUID(),
      lineNumber: index + 1,
      content,
      originalAuthor: userId,
      editedBy: [],
      hasDraft: true
    }));
  }, [userId]);
  
  return { matchAndAssignLines };
};
