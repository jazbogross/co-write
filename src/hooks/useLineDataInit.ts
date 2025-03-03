
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { fetchAllLines, loadDrafts as loadDraftsService } from '@/services/lineDataService';
import { processLinesData } from '@/utils/lineDataProcessing';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

export const useLineDataInit = (
  scriptId: string, 
  originalContent: string, // Kept for compatibility but not used
  userId: string | null,
  isAdmin: boolean = false // Added isAdmin parameter with default false
) => {
  console.log('📊 useLineDataInit: Hook called with', { scriptId, userId, isAdmin });
  
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) {
        console.log('📊 useLineDataInit: fetchLineData aborted: no scriptId or already initialized.');
        return;
      }
      
      console.log('📊 useLineDataInit: fetchLineData called. scriptId:', scriptId);
      setIsDataReady(false); // Reset ready state while loading
      
      try {
        // Get all lines including drafts if admin
        const allLines = await fetchAllLines(scriptId, isAdmin);
        
        if (allLines && allLines.length > 0) {
          console.log('📊 useLineDataInit: Data fetched successfully. Lines count:', allLines.length);
          
          // Log first few lines from database
          allLines.slice(0, 3).forEach((line, i) => {
            console.log(`📊 DB Line ${i+1}:`, {
              id: line.id,
              line_number: line.line_number,
              line_number_draft: isAdmin ? line.line_number_draft : undefined,
              has_draft: isAdmin ? (line.draft !== null) : undefined,
              content_preview: typeof line.content === 'string' 
                ? line.content.substring(0, 30) 
                : JSON.stringify(line.content).substring(0, 30)
            });
          });
          
          // Process the line data, passing the isAdmin flag
          const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
          
          console.log('📊 useLineDataInit: Processed line data:', processedLines.length, 'lines');
          
          // Log first few processed lines
          processedLines.slice(0, 3).forEach((line, i) => {
            console.log(`📊 Processed Line ${i+1}:`, {
              uuid: line.uuid,
              lineNumber: line.lineNumber,
              contentType: typeof line.content,
              isDelta: isDeltaObject(line.content),
              preview: typeof line.content === 'string' 
                ? line.content.substring(0, 30) 
                : JSON.stringify(line.content).substring(0, 30)
            });
          });
          
          setLineData(processedLines);
          lastLineCountRef.current = processedLines.length;
        } else {
          console.log('📊 useLineDataInit: No data found, creating initial line data');
          // Create a blank initial document if none exists yet
          const initialLineData = createInitialLineData("", userId);
          
          contentToUuidMapRef.current.set("", initialLineData[0].uuid);
          
          setLineData(initialLineData);
          lastLineCountRef.current = 1;
        }
        setInitialized(true);
        setIsDataReady(true); // Mark data as ready for TextEditor to use
        console.log('📊 useLineDataInit: Data is now ready for editor to use');
      } catch (error) {
        console.error('📊 useLineDataInit: Error fetching line data:', error);
        setInitialized(true);
        
        if (lineData.length === 0) {
          const initialLineData = createInitialLineData("", userId);
          setLineData(initialLineData);
          setIsDataReady(true);
          lastLineCountRef.current = 1;
          console.log('📊 useLineDataInit: Created fallback initial line data after error');
        }
      }
    };

    fetchLineData();
  }, [scriptId, userId, initialized, lineData.length, isAdmin]);

  // Function to handle loading drafts - now with protection against duplicate calls
  const loadDrafts = async (userId: string | null) => {
    console.log('📊 useLineDataInit: loadDrafts called for user:', userId);
    
    if (!scriptId || !userId || isDraftLoaded || !isAdmin) {
      console.log('📊 useLineDataInit: loadDrafts aborted: missing scriptId or userId, drafts already loaded, or not admin');
      return;
    }
    
    try {
      setIsDraftLoaded(true); // Set flag to prevent duplicate calls
      
      const updatedLines = await loadDraftsService(scriptId, userId, contentToUuidMapRef);
      
      if (updatedLines.length > 0) {
        console.log('📊 useLineDataInit: Draft lines loaded:', updatedLines.length);
        
        // Log first few draft lines
        updatedLines.slice(0, 3).forEach((line, i) => {
          console.log(`📊 Draft Line ${i+1}:`, {
            uuid: line.uuid,
            lineNumber: line.lineNumber,
            contentType: typeof line.content,
            isDelta: isDeltaObject(line.content),
            hasDraft: line.hasDraft || false
          });
        });
        
        setLineData(updatedLines);
        console.log('📊 useLineDataInit: Draft lines loaded successfully:', updatedLines.length);
      } else {
        console.log('📊 useLineDataInit: No draft lines to load');
      }
    } catch (error) {
      console.error('📊 useLineDataInit: Error in loadDrafts:', error);
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
