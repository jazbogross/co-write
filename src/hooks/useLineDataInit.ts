import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { fetchAllLines, loadDrafts as loadDraftsService } from '@/services/lineDataService';
import { processLinesData } from '@/utils/lineDataProcessing';
import { extractPlainTextFromDelta, isDeltaObject } from '@/utils/editor';

/**
 * Hook for initializing line data with race condition protection
 */
export const useLineDataInit = (
  scriptId: string, 
  originalContent: string,
  userId: string | null,
  isAdmin: boolean = false
) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  const [isDraftLoaded, setIsDraftLoaded] = useState(false);
  
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);
  const loadingRef = useRef(false);

  useEffect(() => {
    const fetchLineData = async () => {
      // Prevent concurrent or unnecessary fetches
      if (!scriptId || initialized || loadingRef.current) {
        console.log('📊 useLineDataInit: fetchLineData aborted: invalid state');
        return;
      }
      
      loadingRef.current = true;
      console.log('📊 useLineDataInit: fetchLineData called. scriptId:', scriptId);
      setIsDataReady(false);
      
      try {
        const allLines = await fetchAllLines(scriptId, isAdmin);
        
        if (allLines && allLines.length > 0 && Array.isArray(allLines)) {
          console.log('📊 useLineDataInit: Data fetched successfully. Lines:', allLines.length);
          
          const processedLines = processLinesData(allLines, contentToUuidMapRef, isAdmin);
          console.log('📊 useLineDataInit: Processed lines:', processedLines.length);
          
          // Log sample of processed lines for debugging
          processedLines.slice(0, 3).forEach((line, i) => {
            const contentPreview = typeof line.content === 'string' 
              ? line.content.substring(0, 30)
              : line.content && typeof line.content === 'object' && 'ops' in line.content
                ? JSON.stringify(line.content).substring(0, 30)
                : '[invalid content]';
            
            console.log(`📊 Line ${i+1}:`, {
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
          console.log('📊 useLineDataInit: Creating initial line data');
          const initialLineData = createInitialLineData("", userId);
          contentToUuidMapRef.current.set("", initialLineData[0].uuid);
          setLineData(initialLineData);
          lastLineCountRef.current = 1;
        }
      } catch (error) {
        console.error('📊 useLineDataInit: Error fetching line data:', error);
        if (lineData.length === 0) {
          const initialLineData = createInitialLineData("", userId);
          setLineData(initialLineData);
          lastLineCountRef.current = 1;
        }
      } finally {
        setInitialized(true);
        setIsDataReady(true);
        loadingRef.current = false;
      }
    };

    fetchLineData();
  }, [scriptId, userId, initialized, isAdmin]);

  const loadDrafts = async (userId: string | null) => {
    console.log('📊 useLineDataInit: loadDrafts called for user:', userId);
    
    // Prevent concurrent or invalid draft loads
    if (!scriptId || !userId || isDraftLoaded || !isAdmin || loadingRef.current) {
      console.log('📊 useLineDataInit: loadDrafts aborted: invalid state');
      return;
    }

    loadingRef.current = true;
    
    try {
      setIsDraftLoaded(true);
      
      const updatedLines = await loadDraftsService(
        scriptId, 
        userId, 
        contentToUuidMapRef
      );
      
      if (updatedLines.length > 0) {
        console.log('📊 useLineDataInit: Draft lines loaded:', updatedLines.length);
        
        // Log sample of draft lines for debugging
        updatedLines.slice(0, 3).forEach((line, i) => {
          const contentPreview = typeof line.content === 'string'
            ? line.content.substring(0, 30)
            : line.content && typeof line.content === 'object' && 'ops' in line.content
              ? JSON.stringify(line.content).substring(0, 30)
              : '[invalid content]';
          
          console.log(`📊 Draft ${i+1}:`, {
            uuid: line.uuid,
            lineNumber: line.lineNumber,
            contentType: typeof line.content,
            isDelta: isDeltaObject(line.content),
            hasDraft: line.hasDraft || false,
            preview: contentPreview
          });
        });
        
        setLineData(updatedLines);
      }
    } catch (error) {
      console.error('📊 useLineDataInit: Error loading drafts:', error);
      setIsDraftLoaded(false);
    } finally {
      loadingRef.current = false;
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
