
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { fetchLineDataFromSupabase, formatLineDataFromSupabase, createInitialLineData } from '@/utils/lineDataUtils';
import { supabase } from '@/integrations/supabase/client';

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
        // First, try to fetch all lines including drafts
        const { data: allLines, error: allLinesError } = await supabase
          .from('script_content')
          .select('id, line_number, line_number_draft, content, draft')
          .eq('script_id', scriptId)
          .order('line_number_draft', { ascending: true, nullsFirst: true });
          
        if (allLinesError) throw allLinesError;
        
        if (allLines && allLines.length > 0) {
          console.log('**** UseLineData **** Data fetched successfully. Lines count:', allLines.length);
          
          // Process the lines, prioritizing draft content and line numbers
          const processedLineData = allLines
            .filter(line => line.draft !== '{deleted-uuid}') // Filter out deleted lines
            .map(line => {
              // Prioritize draft content/line numbers over original
              const content = line.draft !== null ? line.draft : line.content;
              const lineNumber = line.line_number_draft !== null ? line.line_number_draft : line.line_number;
              
              return {
                uuid: line.id,
                content,
                lineNumber,
                originalAuthor: null, // Will be populated later
                editedBy: []
              };
            })
            // Sort by line number
            .sort((a, b) => a.lineNumber - b.lineNumber);
          
          // Update line numbers to ensure continuity
          processedLineData.forEach((line, index) => {
            line.lineNumber = index + 1;
            
            originalUuidsRef.current.set(line.uuid, line.uuid);
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          setLineData(processedLineData);
          lastLineCountRef.current = processedLineData.length;
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
