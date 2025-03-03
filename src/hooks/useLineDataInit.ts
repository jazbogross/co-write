
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { fetchAllLines, loadDrafts as loadDraftsService } from '@/services/lineDataService';
import { processLinesData } from '@/utils/lineDataProcessing';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editorUtils';

export const useLineDataInit = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null
) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) {
        console.log('**** UseLineData **** fetchLineData aborted: no scriptId or already initialized.');
        return;
      }
      
      console.log('**** UseLineData **** fetchLineData called. scriptId:', scriptId);
      setIsDataReady(false); // Reset ready state while loading
      
      try {
        // Get all lines including drafts
        const allLines = await fetchAllLines(scriptId);
        
        if (allLines && allLines.length > 0) {
          console.log('**** UseLineData **** Data fetched successfully. Lines count:', allLines.length);
          
          // Log a sample of data for debugging
          if (allLines[0]) {
            console.log('**** UseLineData **** Sample data:', {
              sample: allLines[0],
              hasDraft: allLines[0].draft !== null || allLines[0].line_number_draft !== null,
              draftContent: allLines[0].draft ? extractPlainTextFromDelta(allLines[0].draft) : null
            });
          }
          
          // Process the line data
          const processedLines = processLinesData(allLines, contentToUuidMapRef);
          
          console.log('**** UseLineData **** Processed line data:', processedLines.length, 'lines');
          console.log('**** UseLineData **** Line data preview:', processedLines.slice(0, 3));
          
          setLineData(processedLines);
          lastLineCountRef.current = processedLines.length;
        } else {
          console.log('**** UseLineData **** No data found, creating initial line data');
          const initialLineData = createInitialLineData(originalContent, userId);
          
          contentToUuidMapRef.current.set(originalContent, initialLineData[0].uuid);
          
          setLineData(initialLineData);
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

  // Function to handle loading drafts
  const loadDrafts = async (userId: string | null) => {
    if (!scriptId || !userId) {
      console.log('**** UseLineData **** loadDrafts aborted: missing scriptId or userId');
      return;
    }
    
    try {
      const updatedLines = await loadDraftsService(scriptId, userId, contentToUuidMapRef);
      
      if (updatedLines.length > 0) {
        setLineData(updatedLines);
      }
    } catch (error) {
      console.error('**** UseLineData **** Error in loadDrafts:', error);
    }
  };

  return { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef, 
    lastLineCountRef,
    loadDrafts
  };
};
