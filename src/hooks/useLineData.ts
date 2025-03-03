
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { useDrafts } from './useDrafts';
import { useEditorInit } from './useEditorInit';
import { useLineDataInit } from './useLineDataInit';
import { useLineMatching } from './useLineMatching';
import { isDeltaObject } from '@/utils/editor';

export type { LineData } from '@/types/lineTypes';

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
  console.log('🔠 useLineData: Hook called with', { scriptId, userId });
  
  const previousContentRef = useRef<string[]>([]);
  const uuidAssignmentStats = useRef({
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  });

  // Use the updated modularized hooks
  const { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts 
  } = useLineDataInit(scriptId, originalContent, userId);
  
  const { matchAndAssignLines } = useLineMatching(userId);
  const { loadDraftsForCurrentUser } = useDrafts();
  const { initializeEditor } = useEditorInit(lineData, isDataReady);

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
      
      const domUuidMap = quill.lineTracking.getDomUuidMap();
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
  }, [matchAndAssignLines]);

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
  }, [userId, contentToUuidMapRef]);

  // Updated to use the new consolidated loadDrafts function
  const loadUserDrafts = useCallback(() => {
    console.log('🔠 useLineData: loadUserDrafts called');
    return loadDraftsForCurrentUser(
      scriptId, 
      userId, 
      setLineData, 
      contentToUuidMapRef,
      loadDrafts // Pass the implementation from useLineDataInit
    );
  }, [scriptId, userId, loadDraftsForCurrentUser, contentToUuidMapRef, loadDrafts, setLineData]);

  return { 
    lineData, 
    setLineData, 
    updateLineContent, 
    updateLineContents,
    loadDraftsForCurrentUser: loadUserDrafts,
    isDataReady,
    initializeEditor
  };
};
