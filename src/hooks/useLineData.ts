
import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { findBestMatchingLine, fetchLineDataFromSupabase, formatLineDataFromSupabase, createInitialLineData } from '@/utils/lineDataUtils';
import { useDrafts } from './useDrafts';
import { useEditorInit } from './useEditorInit';

export { LineData } from '@/types/lineTypes';

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const previousContentRef = useRef<string[]>([]);
  
  const originalUuidsRef = useRef<Map<string, string>>(new Map());
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());

  const { loadDraftsForCurrentUser } = useDrafts();
  const { initializeEditor } = useEditorInit(lineData, isDataReady);

  // Fetch line data from Supabase
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
            console.log(`**** UseLineData **** Fetched data for line ${line.lineNumber} (zero-indexed): ${JSON.stringify(line)}`);
            originalUuidsRef.current.set(line.uuid, line.uuid);
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          setLineData(formattedLineData);
          previousContentRef.current = formattedLineData.map(line => line.content);
        } else {
          console.log('**** UseLineData **** No data found, creating initial line data');
          const initialLineData = createInitialLineData(originalContent, userId);
          
          originalUuidsRef.current.set(initialLineData[0].uuid, initialLineData[0].uuid);
          contentToUuidMapRef.current.set(originalContent, initialLineData[0].uuid);
          
          setLineData(initialLineData);
          previousContentRef.current = [originalContent];
        }
        setInitialized(true);
        setIsDataReady(true); // Mark data as ready for TextEditor to use
        console.log('**** UseLineData **** Data is now ready for editor to use');
      } catch (error) {
        console.error('**** UseLineData **** Error fetching line data:', error);
        setInitialized(true);
        
        // Even if there's an error, try to initialize with some data
        if (lineData.length === 0) {
          const initialLineData = createInitialLineData(originalContent, userId);
          setLineData(initialLineData);
          setIsDataReady(true);
        }
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized, lineData.length]);

  const updateLineContents = (newContents: string[], quill: any) => {
    setLineData(prevData => {
      const usedIndices = new Set<number>();
      const newData: LineData[] = [];
      
      for (let i = 0; i < newContents.length; i++) {
        const content = newContents[i];
        
        const match = findBestMatchingLine(content, prevData, usedIndices, contentToUuidMapRef.current);
        
        if (match) {
          const matchIndex = match.index;
          usedIndices.add(matchIndex);
          
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
        } else {
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
      
      previousContentRef.current = newContents;
      
      return newData;
    });
  };

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

  // Wrapper for loadDraftsForCurrentUser to include the contentToUuidMapRef
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
