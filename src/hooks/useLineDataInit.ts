
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { supabase } from '@/integrations/supabase/client';

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
        // Get all lines including drafts, with improved ordering that prioritizes drafts
        const { data: allLines, error: allLinesError } = await supabase
          .from('script_content')
          .select('id, line_number, line_number_draft, content, draft')
          .eq('script_id', scriptId)
          .order('line_number_draft', { ascending: true, nullsFirst: false }); // Prioritize drafts
          
        if (allLinesError) throw allLinesError;
        
        if (allLines && allLines.length > 0) {
          console.log('**** UseLineData **** Data fetched successfully. Lines count:', allLines.length);
          
          // Simplified draft processing logic
          const processedLineData = allLines
            .filter(line => line.draft !== '{deleted-uuid}') // Filter out deleted lines
            .map(line => {
              // Check if this line has draft content or draft line number
              const hasDraft = line.draft !== null && line.draft !== '' || 
                              line.line_number_draft !== null;
              
              return {
                uuid: line.id,
                content: hasDraft ? (line.draft || line.content) : line.content,
                lineNumber: hasDraft ? (line.line_number_draft || line.line_number) : line.line_number,
                originalAuthor: null, // Will be populated later
                editedBy: [],
                hasDraft: hasDraft,
                originalContent: line.content, // Store original content for reference
                originalLineNumber: line.line_number // Store original line number for reference
              };
            })
            // Sort by line number to ensure order
            .sort((a, b) => a.lineNumber - b.lineNumber);
          
          // Update line numbers to ensure continuity
          processedLineData.forEach((line, index) => {
            line.lineNumber = index + 1;
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          setLineData(processedLineData);
          lastLineCountRef.current = processedLineData.length;
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

  // Simplified function to handle loading drafts
  const loadDrafts = async (userId: string | null) => {
    if (!scriptId || !userId) {
      console.log('**** UseLineData **** loadDrafts aborted: missing scriptId or userId');
      return;
    }
    
    console.log('**** UseLineData **** Loading drafts for user:', userId);
    
    try {
      // Reload all line data to ensure we have the latest drafts
      const { data: draftLines, error: draftError } = await supabase
        .from('script_content')
        .select('id, line_number, line_number_draft, content, draft')
        .eq('script_id', scriptId)
        .order('line_number_draft', { ascending: true, nullsFirst: false });
        
      if (draftError) throw draftError;
      
      if (draftLines && draftLines.length > 0) {
        // Process all lines with simplified draft logic
        setLineData(prevData => {
          // Process all draft lines
          const updatedLines = draftLines
            .filter(line => line.draft !== '{deleted-uuid}') // Filter out deleted lines
            .map(line => {
              // Check if this line has draft content or draft line number
              const hasDraft = line.draft !== null && line.draft !== '' || 
                              line.line_number_draft !== null;
              
              return {
                uuid: line.id,
                content: hasDraft ? (line.draft || line.content) : line.content,
                lineNumber: hasDraft ? (line.line_number_draft || line.line_number) : line.line_number,
                originalAuthor: null,
                editedBy: [],
                hasDraft: hasDraft,
                originalContent: line.content,
                originalLineNumber: line.line_number
              };
            });
          
          // Sort and renumber
          updatedLines.sort((a, b) => a.lineNumber - b.lineNumber);
          updatedLines.forEach((line, index) => {
            line.lineNumber = index + 1;
            // Update content-to-uuid map
            contentToUuidMapRef.current.set(line.content, line.uuid);
          });
          
          console.log(`**** UseLineData **** Applied draft updates to ${updatedLines.length} lines`);
          return updatedLines;
        });
      }
    } catch (error) {
      console.error('**** UseLineData **** Error loading drafts:', error);
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
