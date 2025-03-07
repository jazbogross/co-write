
import { useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { isDeltaObject } from '@/utils/editor';

export const useLineAssignment = (
  lineData: LineData[],
  setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>,
  lastLineCountRef: React.MutableRefObject<number>,
  previousContentRef: React.MutableRefObject<string[]>,
  uuidAssignmentStats: React.MutableRefObject<{
    preserved: number;
    regenerated: number;
    matchStrategy: Record<string, number>;
  }>,
  userId: string | null,
  matchAndAssignLines: (
    newContents: any[],
    prevData: LineData[],
    contentToUuidMap: Map<string, string>,
    domUuidMap: Map<number, string>,
    quill: any
  ) => { newData: LineData[], stats: any }
) => {
  // Handle updating multiple lines at once
  const updateLineContents = useCallback((newContents: any[], quill: any) => {
    console.log('🔠 useLineData: updateLineContents called with', { 
      newContentsLength: newContents.length, 
      hasQuill: !!quill,
      hasLineTracking: !!(quill && quill.lineTracking)
    });
    
    if (!quill || !quill.lineTracking) {
      console.log('🔠 useLineData: updateLineContents: Line tracking not available.');
      return;
    }

    setLineData(prevData => {
      if (newContents.length === 0) {
        console.log('🔠 useLineData: Empty content received, preserving existing data');
        return prevData;
      }

      console.log(`🔠 useLineData: Prev data length: ${prevData.length}, new contents length: ${newContents.length}`);
      
      // Log first few content items
      newContents.slice(0, 3).forEach((content, i) => {
        console.log(`🔠 Content ${i+1} type:`, 
          typeof content, 
          isDeltaObject(content) ? 'isDelta' : 'notDelta',
          'ops:', content.ops ? content.ops.length : 'N/A'
        );
      });

      uuidAssignmentStats.current = {
        preserved: 0,
        regenerated: 0,
        matchStrategy: {}
      };
      
      const lineCountDiff = Math.abs(newContents.length - lastLineCountRef.current);
      if (lineCountDiff > 3) {
        console.log(`🔠 useLineData: Line count changed significantly: ${lastLineCountRef.current} -> ${newContents.length}`);
      }
      lastLineCountRef.current = newContents.length;
      
      // Get the DOM UUID map safely
      let domUuidMap = new Map<number, string>();
      try {
        if (typeof quill.lineTracking.getDomUuidMap === 'function') {
          domUuidMap = quill.lineTracking.getDomUuidMap();
        } else {
          console.warn('🔠 useLineData: getDomUuidMap is not a function, using empty map');
        }
      } catch (error) {
        console.error('🔠 useLineData: Error calling getDomUuidMap:', error);
      }
      
      console.log(`🔠 useLineData: DOM UUID map size: ${domUuidMap.size}`);
      
      const { newData, stats } = matchAndAssignLines(
        newContents, 
        prevData, 
        contentToUuidMapRef.current, 
        domUuidMap, 
        quill
      );
      
      uuidAssignmentStats.current = stats;
      
      if (uuidAssignmentStats.current.regenerated > 0) {
        console.log(
          `🔠 useLineData: UUID stats: preserved=${uuidAssignmentStats.current.preserved}, ` +
          `regenerated=${uuidAssignmentStats.current.regenerated}, ` +
          `strategies=${JSON.stringify(uuidAssignmentStats.current.matchStrategy)}`
        );
      }
      
      console.log(`🔠 useLineData: Returning ${newData.length} updated lines`);
      
      // Log the first few new data items
      newData.slice(0, 3).forEach((item, i) => {
        console.log(`🔠 New data item ${i+1}:`, {
          uuid: item.uuid,
          lineNumber: item.lineNumber,
          contentType: typeof item.content,
          isDelta: isDeltaObject(item.content),
          preview: typeof item.content === 'string' 
            ? item.content.substring(0, 30)
            : JSON.stringify(item.content).substring(0, 30) + '...'
        });
      });
      
      previousContentRef.current = newContents.map(content => 
        typeof content === 'object' ? JSON.stringify(content) : String(content)
      );
      
      return newData;
    });
  }, [matchAndAssignLines, setLineData]);

  // Handle updating a single line
  const updateLineContent = useCallback((lineIndex: number, newContent: string) => {
    console.log(`🔠 useLineData: updateLineContent for line ${lineIndex}`);
    
    setLineData(prevData => {
      const newData = [...prevData];
      
      while (newData.length <= lineIndex) {
        const newUuid = uuidv4();
        console.log(`🔠 useLineData: Creating new line at index ${newData.length} with UUID ${newUuid}`);
        
        newData.push({
          uuid: newUuid,
          lineNumber: newData.length + 1,
          content: '',
          originalAuthor: userId,
          editedBy: [],
          hasDraft: true // Mark new lines as drafts
        });
        contentToUuidMapRef.current.set('', newUuid);
      }
      
      if (newData[lineIndex]) {
        const existingLine = newData[lineIndex];
        console.log(`🔠 useLineData: Updating line ${lineIndex} with UUID ${existingLine.uuid}`);
        
        newData[lineIndex] = {
          ...existingLine,
          content: newContent,
          hasDraft: true, // Mark as draft when content is updated
          editedBy: userId && !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        };
        
        contentToUuidMapRef.current.set(newContent, existingLine.uuid);
      }
      
      return newData;
    });
  }, [userId, setLineData]);

  return {
    updateLineContent,
    updateLineContents
  };
};
