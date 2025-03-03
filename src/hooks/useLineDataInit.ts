
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { supabase } from '@/integrations/supabase/client';
import { extractPlainTextFromDelta } from '@/utils/editorUtils';

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
          .order('line_number', { ascending: true });
          
        if (allLinesError) throw allLinesError;
        
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
          
          // Create a map to store the final line data by line number
          const lineNumberMap = new Map<number, LineData>();
          
          // First, process all lines without drafts to establish the base structure
          allLines.forEach(line => {
            if (line.draft !== '{deleted-uuid}') {
              // Calculate effective line number (use draft if available)
              const effectiveLineNumber = line.line_number_draft !== null ? line.line_number_draft : line.line_number;
              
              // Process content - extract plain text from Delta if needed
              const hasDraft = line.draft !== null || line.line_number_draft !== null;
              const finalContent = hasDraft 
                ? (line.draft !== null ? extractPlainTextFromDelta(line.draft) : line.content) 
                : line.content;
              
              const lineDataItem: LineData = {
                uuid: line.id,
                content: finalContent,
                lineNumber: effectiveLineNumber,
                originalAuthor: null, // Will be populated later
                editedBy: [],
                hasDraft: hasDraft,
                originalContent: line.content, // Store original content for reference
                originalLineNumber: line.line_number // Store original line number for reference
              };
              
              // Store in map by effective line number
              lineNumberMap.set(effectiveLineNumber, lineDataItem);
              
              // Also update the content-to-UUID map
              contentToUuidMapRef.current.set(finalContent, line.id);
            }
          });
          
          // Convert map to array and sort by line number
          const processedLineData = Array.from(lineNumberMap.values())
            .sort((a, b) => a.lineNumber - b.lineNumber);
          
          // Renumber lines to ensure continuity (1, 2, 3, ...)
          processedLineData.forEach((line, index) => {
            line.lineNumber = index + 1;
          });
          
          console.log('**** UseLineData **** Processed line data:', processedLineData.length, 'lines');
          
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
        .order('line_number', { ascending: true });
        
      if (draftError) throw draftError;
      
      if (draftLines && draftLines.length > 0) {
        // Debug log for first draft
        if (draftLines[0] && draftLines[0].draft) {
          console.log('**** UseLineData **** Sample draft data:', {
            raw: draftLines[0].draft,
            extracted: extractPlainTextFromDelta(draftLines[0].draft)
          });
        }
        
        // Create a map to store the final line data by line number
        const lineNumberMap = new Map<number, LineData>();
        
        // Process all lines with simplified draft logic
        draftLines.forEach(line => {
          if (line.draft !== '{deleted-uuid}') {
            // Calculate effective line number (use draft if available)
            const effectiveLineNumber = line.line_number_draft !== null ? line.line_number_draft : line.line_number;
            
            // Process content - extract plain text from Delta if needed
            const hasDraft = line.draft !== null || line.line_number_draft !== null;
            const finalContent = hasDraft 
              ? (line.draft !== null ? extractPlainTextFromDelta(line.draft) : line.content) 
              : line.content;
            
            const lineDataItem: LineData = {
              uuid: line.id,
              content: finalContent,
              lineNumber: effectiveLineNumber,
              originalAuthor: null,
              editedBy: [],
              hasDraft: hasDraft,
              originalContent: line.content,
              originalLineNumber: line.line_number
            };
            
            // Store in map by effective line number
            lineNumberMap.set(effectiveLineNumber, lineDataItem);
            
            // Also update the content-to-UUID map
            contentToUuidMapRef.current.set(finalContent, line.id);
          }
        });
        
        // Convert map to array and sort by line number
        const updatedLines = Array.from(lineNumberMap.values())
          .sort((a, b) => a.lineNumber - b.lineNumber);
        
        // Renumber lines to ensure continuity (1, 2, 3, ...)
        updatedLines.forEach((line, index) => {
          line.lineNumber = index + 1;
        });
        
        console.log(`**** UseLineData **** Applied draft updates to ${updatedLines.length} lines`);
        
        setLineData(updatedLines);
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
