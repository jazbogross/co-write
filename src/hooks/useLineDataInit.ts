
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
          
          // Type safe iteration over fetched lines
          if (Array.isArray(allLines)) {
            // Process the line data, passing the isAdmin flag
            const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
            
            console.log('📊 useLineDataInit: Processed line data:', processedLines.length, 'lines');
            
            // Safely log processed lines
            processedLines.slice(0, 3).forEach((line, i) => {
              // Type-safe access to line content for logging
              let contentPreview: string;
              if (typeof line.content === 'string') {
                contentPreview = line.content.substring(0, 30);
              } else if (line.content && typeof line.content === 'object' && 'ops' in line.content) {
                contentPreview = JSON.stringify(line.content).substring(0, 30);
              } else {
                contentPreview = '[invalid content format]';
              }
              
              console.log(`📊 Processed Line ${i+1}:`, {
                uuid: line.uuid,
                lineNumber: line.lineNumber,
                contentType: typeof line.content,
                isDelta: isDeltaObject(line.content),
                preview: contentPreview
              });
            });
            
            setLineData(processedLines);
            lastLineCountRef.current = processedLines.length;
          } else {
            console.error('📊 useLineDataInit: Fetched lines is not an array', allLines);
            // Create a blank initial document if data format is incorrect
            const initialLineData = createInitialLineData("", userId);
            contentToUuidMapRef.current.set("", initialLineData[0].uuid);
            setLineData(initialLineData);
            lastLineCountRef.current = 1;
          }
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
        
        // Type-safe logging of draft lines
        updatedLines.slice(0, 3).forEach((line, i) => {
          // Safe content preview for logging
          let contentPreview: string;
          if (typeof line.content === 'string') {
            contentPreview = line.content.substring(0, 30);
          } else if (line.content && typeof line.content === 'object' && 'ops' in line.content) {
            contentPreview = JSON.stringify(line.content).substring(0, 30);
          } else {
            contentPreview = '[invalid content format]';
          }
          
          console.log(`📊 Draft Line ${i+1}:`, {
            uuid: line.uuid,
            lineNumber: line.lineNumber,
            contentType: typeof line.content,
            isDelta: isDeltaObject(line.content),
            hasDraft: line.hasDraft || false,
            preview: contentPreview
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
