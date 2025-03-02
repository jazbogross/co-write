
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { fetchLineDataFromSupabase, formatLineDataFromSupabase, createInitialLineData } from '@/utils/lineDataUtils';

export const useLineDataInit = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null
) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const [isDataReady, setIsDataReady] = useState(false);
  
  const originalUuidsRef = useRef<Map<string, string>>(new Map());
  const contentToUuidMapRef = useRef<Map<string, string>>(new Map());
  const lastLineCountRef = useRef<number>(0);

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
          lastLineCountRef.current = formattedLineData.length;
        } else {
          console.log('**** UseLineData **** No data found, creating initial line data');
          const initialLineData = createInitialLineData(originalContent, userId);
          
          originalUuidsRef.current.set(initialLineData[0].uuid, initialLineData[0].uuid);
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

  return { 
    lineData, 
    setLineData, 
    isDataReady, 
    originalUuidsRef, 
    contentToUuidMapRef, 
    lastLineCountRef 
  };
};
