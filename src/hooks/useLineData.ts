
import { useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { useDrafts } from './useDrafts';
import { useEditorInit } from './useEditorInit';
import { useLineDataInit } from './useLineDataInit';
import { useLineMatching } from './useLineMatching';

export type { LineData } from '@/types/lineTypes';

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
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
    if (!quill || !quill.lineTracking) {
      console.log('**** UseLineData **** updateLineContents: Line tracking not available.');
      return;
    }

    setLineData(prevData => {
      if (newContents.length === 0) {
        console.log('**** UseLineData **** Empty content received, preserving existing data');
        return prevData;
      }

      uuidAssignmentStats.current = {
        preserved: 0,
        regenerated: 0,
        matchStrategy: {}
      };
      
      const lineCountDiff = Math.abs(newContents.length - lastLineCountRef.current);
      if (lineCountDiff > 3) {
        console.log(`**** UseLineData **** Line count changed significantly: ${lastLineCountRef.current} -> ${newContents.length}`);
      }
      lastLineCountRef.current = newContents.length;
      
      const domUuidMap = quill.lineTracking.getDomUuidMap();
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
          `**** UseLineData **** UUID stats: preserved=${uuidAssignmentStats.current.preserved}, ` +
          `regenerated=${uuidAssignmentStats.current.regenerated}, ` +
          `strategies=${JSON.stringify(uuidAssignmentStats.current.matchStrategy)}`
        );
      }
      
      previousContentRef.current = newContents.map(content => 
        typeof content === 'object' ? JSON.stringify(content) : String(content)
      );
      
      return newData;
    });
  }, [matchAndAssignLines]);

  const updateLineContent = useCallback((lineIndex: number, newContent: string) => {
    setLineData(prevData => {
      const newData = [...prevData];
      
      while (newData.length <= lineIndex) {
        const newUuid = uuidv4();
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
