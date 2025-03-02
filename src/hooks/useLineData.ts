import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { fetchLineDataFromSupabase, formatLineDataFromSupabase, createInitialLineData } from '@/utils/lineDataUtils';
import { findBestMatchingLine } from '@/utils/lineMatching';
import { useDrafts } from './useDrafts';
import { useEditorInit } from './useEditorInit';
import { useContentBuffer } from './useContentBuffer';

export type { LineData } from '@/types/lineTypes';

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const previousContentRef = useRef<string[]>([]);
  
  const originalUuidsRef = useRef<Map<string, string>>(new Map());
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  
  const lastLineCountRef = useRef<number>(0);
  
  const uuidAssignmentStats = useRef({
    preserved: 0,
    regenerated: 0,
    matchStrategy: {} as Record<string, number>
  });

  const { loadDraftsForCurrentUser } = useDrafts();
  const { initializeEditor } = useEditorInit(lineData, isDataReady);

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) {
        console.log('**** UseLineData **** fetchLineData aborted because either no scriptId or already initialized.');
        return;
      }
      
      console.log('**** UseLineData **** fetchLineData called. scriptId:', scriptId, 'initialized:', initialized);
      setIsDataReady(false); // Reset ready state while loading
      
      try {
        const data = await fetchLineDataFromSupabase(scriptId);

        if (data && data.length > 0) {
          console.log('**** UseLineData **** Data fetched successfully. Lines count:', data.length);
          const formattedLineData = formatLineDataFromSupabase(data);
          
          formattedLineData.forEach(line => {
            originalUuidsRef.current.set(line.uuid, line.uuid);
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          setLineData(formattedLineData);
          previousContentRef.current = formattedLineData.map(line => line.content);
          lastLineCountRef.current = formattedLineData.length;
        } else {
          console.log('**** UseLineData **** No data found, creating initial line data');
          const initialLineData = createInitialLineData(originalContent, userId);
          
          originalUuidsRef.current.set(initialLineData[0].uuid, initialLineData[0].uuid);
          contentToUuidMapRef.current.set(originalContent, initialLineData[0].uuid);
          
          setLineData(initialLineData);
          previousContentRef.current = [originalContent];
          lastLineCountRef.current = 1;
        }
        setInitialized(true);
        setIsDataReady(true); // Mark data as ready for TextEditor to use
        console.log('**** UseLineData **** Data is now ready for editor to use');
      } catch (error) {
        console.error('**** UseLineData **** Error fetching line data:', error);
        setInitialized(true);
        
        if (lineData.length === 0) {
          const initialLineData = createInitialLineData(originalContent, userId);
          setLineData(initialLineData);
          setIsDataReady(true);
          lastLineCountRef.current = 1;
        }
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized, lineData.length]);

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
      
      const usedIndices = new Set<number>();
      const newData: LineData[] = [];
      
      const domUuidMap = quill.lineTracking.getDomUuidMap();
      
      const lineCountDiff = Math.abs(newContents.length - lastLineCountRef.current);
      if (lineCountDiff > 3) {
        console.log(`**** UseLineData **** Line count changed significantly: ${lastLineCountRef.current} -> ${newContents.length}`);
      }
      lastLineCountRef.current = newContents.length;
      
      for (let i = 0; i < newContents.length; i++) {
        const content = newContents[i];
        
        const match = findBestMatchingLine(
          content, 
          i, 
          prevData, 
          usedIndices, 
          contentToUuidMapRef.current,
          true, 
          domUuidMap
        );
        
        if (match) {
          const matchIndex = match.index;
          usedIndices.add(matchIndex);
          
          const strategy = match.matchStrategy;
          uuidAssignmentStats.current.matchStrategy[strategy] = 
            (uuidAssignmentStats.current.matchStrategy[strategy] || 0) + 1;
          
          uuidAssignmentStats.current.preserved++;
          
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
          
          contentToUuidMapRef.current.set(content, existingLine.uuid);
          
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, existingLine.uuid);
          }
        } else {
          uuidAssignmentStats.current.regenerated++;
          
          const newUuid = uuidv4();
          newData.push({
            uuid: newUuid,
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          });
          
          contentToUuidMapRef.current.set(content, newUuid);
          
          if (quill && quill.lineTracking) {
            quill.lineTracking.setLineUuid(i + 1, newUuid);
          }
        }
      }
      
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
  }, [userId]);

  const updateLineContent = (lineIndex: number, newContent: string) => {
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
  };

  const loadDrafts = useCallback(() => {
    return loadDraftsForCurrentUser(scriptId, userId, setLineData, contentToUuidMapRef);
  }, [scriptId, userId, loadDraftsForCurrentUser]);

  return { 
    lineData, 
    setLineData, 
    updateLineContent, 
    updateLineContents,
    loadDraftsForCurrentUser: loadDrafts,
    isDataReady,
    initializeEditor
  };
};
