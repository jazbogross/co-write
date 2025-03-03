
import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { useDrafts } from './useDrafts';
import { useEditorInit } from './useEditorInit';
import { useLineDataInit } from './useLineDataInit';
import { useLineMatching } from './useLineMatching';

export type { LineData } from '@/types/lineTypes';

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
  const previousContentRef = useRef<string[]>([]);
  const hasFetchedDraftsRef = useRef<boolean>(false);
  const uuidAssignmentStats = useRef({
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  });

  // Use the modularized hooks
  const { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef,
    lastLineCountRef 
  } = useLineDataInit(scriptId, originalContent, userId);
  
  const { matchAndAssignLines } = useLineMatching(userId);
  const { loadDraftsForCurrentUser, lastLoadedTimestamp } = useDrafts();
  const { initializeEditor } = useEditorInit(lineData, isDataReady);

  // Load drafts when userId becomes available and data is ready
  useEffect(() => {
    const fetchDrafts = async () => {
      if (userId && isDataReady && scriptId && !hasFetchedDraftsRef.current) {
        console.log('Attempting to auto-load drafts for user:', userId);
        const hasDrafts = await loadDraftsForCurrentUser(scriptId, userId, setLineData, contentToUuidMapRef);
        hasFetchedDraftsRef.current = true;
        
        if (hasDrafts) {
          console.log('Drafts loaded successfully during initialization');
        } else {
          console.log('No drafts found or loading failed during initialization');
        }
      }
    };
    
    fetchDrafts();
  }, [userId, isDataReady, scriptId, loadDraftsForCurrentUser]);

  const updateLineContents = useCallback((newContents: string[], quill: any) => {
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
      
      previousContentRef.current = newContents;
      
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
          editedBy: []
        });
        contentToUuidMapRef.current.set('', newUuid);
      }
      
      if (newData[lineIndex]) {
        const existingLine = newData[lineIndex];
        newData[lineIndex] = {
          ...existingLine,
          content: newContent,
          editedBy: userId && !existingLine.editedBy.includes(userId)
            ? [...existingLine.editedBy, userId]
            : existingLine.editedBy
        };
        
        contentToUuidMapRef.current.set(newContent, existingLine.uuid);
      }
      
      return newData;
    });
  }, [userId, contentToUuidMapRef]);

  const loadDrafts = useCallback(async () => {
    console.log('Manual draft loading requested');
    hasFetchedDraftsRef.current = true;
    return await loadDraftsForCurrentUser(scriptId, userId, setLineData, contentToUuidMapRef);
  }, [scriptId, userId, loadDraftsForCurrentUser]);

  // Export whether drafts have been fetched
  const draftStatus = {
    hasFetchedDrafts: hasFetchedDraftsRef.current,
    lastLoadedTimestamp
  };

  return { 
    lineData, 
    setLineData, 
    updateLineContent, 
    updateLineContents,
    loadDraftsForCurrentUser: loadDrafts,
    draftStatus,
    isDataReady,
    initializeEditor
  };
};
