
import { useState, useEffect, useRef } from 'react';
import { LineData } from '@/types/lineTypes';
import { createInitialLineData } from '@/utils/lineDataUtils';
import { supabase } from '@/integrations/supabase/client';
import { extractPlainTextFromDelta, isDeltaObject, logDeltaStructure } from '@/utils/editorUtils';

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
          const lineMap = new Map<number, LineData>();
          
          // Process all lines
          allLines.forEach(line => {
            if (line.draft === '{deleted-uuid}') {
              // Skip deleted lines
              return;
            }
            
            // Determine the effective line number and content to use
            const useLineNumberDraft = line.line_number_draft !== null;
            const useDraftContent = line.draft !== null;
            
            // Get the effective line number
            const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
            
            // Process the content - extract text from Delta if needed
            let finalContent = line.content;
            
            if (useDraftContent) {
              // If we have draft content, use it (parse delta if needed)
              if (isDeltaObject(line.draft)) {
                finalContent = extractPlainTextFromDelta(line.draft);
                // Debug log Delta structure
                logDeltaStructure(line.draft);
              } else {
                finalContent = line.draft || '';
              }
            }
            
            const lineDataItem: LineData = {
              uuid: line.id,
              content: finalContent,
              lineNumber: effectiveLineNumber,
              originalAuthor: null, // Will be populated later
              editedBy: [],
              hasDraft: useLineNumberDraft || useDraftContent,
              originalContent: line.content, // Store original content for reference
              originalLineNumber: line.line_number // Store original line number for reference
            };
            
            // Add to our line map using effective line number as key
            lineMap.set(effectiveLineNumber, lineDataItem);
            
            // Update the content-to-UUID map
            contentToUuidMapRef.current.set(finalContent, line.id);
          });
          
          // Convert map to array and sort by line number
          const processedLines = Array.from(lineMap.values())
            .sort((a, b) => a.lineNumber - b.lineNumber);
          
          // Renumber lines to ensure continuity (1, 2, 3, ...)
          processedLines.forEach((line, index) => {
            line.lineNumber = index + 1;
          });
          
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
        if (draftLines[0]) {
          console.log('**** UseLineData **** Sample draft data:', {
            raw: draftLines[0].draft,
            extracted: draftLines[0].draft ? extractPlainTextFromDelta(draftLines[0].draft) : null,
            isDelta: draftLines[0].draft ? isDeltaObject(draftLines[0].draft) : false
          });
        }
        
        // Create a map to store the final line data by line number
        const lineMap = new Map<number, LineData>();
        
        // Process all lines with simplified draft logic
        draftLines.forEach(line => {
          if (line.draft === '{deleted-uuid}') {
            // Skip deleted lines
            return;
          }
          
          // Determine if we should use the draft content and/or line number
          const useLineNumberDraft = line.line_number_draft !== null;
          const useDraftContent = line.draft !== null;
          
          if (!useLineNumberDraft && !useDraftContent) {
            // No drafts for this line, use the original content and line number
            const lineDataItem: LineData = {
              uuid: line.id,
              content: line.content,
              lineNumber: line.line_number,
              originalAuthor: null,
              editedBy: [],
              hasDraft: false,
              originalContent: line.content,
              originalLineNumber: line.line_number
            };
            
            lineMap.set(line.line_number, lineDataItem);
            contentToUuidMapRef.current.set(line.content, line.id);
            return;
          }
          
          // Get the effective line number and content
          const effectiveLineNumber = useLineNumberDraft ? line.line_number_draft : line.line_number;
          
          // Process content - extract plain text from Delta if needed
          let finalContent = line.content;
          
          if (useDraftContent) {
            if (isDeltaObject(line.draft)) {
              finalContent = extractPlainTextFromDelta(line.draft);
              console.log(`Line ${effectiveLineNumber} draft content is a Delta:`, finalContent);
            } else {
              finalContent = line.draft || '';
              console.log(`Line ${effectiveLineNumber} draft content is plain text:`, finalContent);
            }
          }
          
          const lineDataItem: LineData = {
            uuid: line.id,
            content: finalContent,
            lineNumber: effectiveLineNumber,
            originalAuthor: null,
            editedBy: [],
            hasDraft: true,
            originalContent: line.content,
            originalLineNumber: line.line_number
          };
          
          lineMap.set(effectiveLineNumber, lineDataItem);
          contentToUuidMapRef.current.set(finalContent, line.id);
        });
        
        // Convert map to array and sort by line number
        const updatedLines = Array.from(lineMap.values())
          .sort((a, b) => a.lineNumber - b.lineNumber);
        
        // Renumber lines to ensure continuity (1, 2, 3, ...)
        updatedLines.forEach((line, index) => {
          line.lineNumber = index + 1;
        });
        
        console.log(`**** UseLineData **** Applied draft updates to ${updatedLines.length} lines`);
        console.log('**** UseLineData **** Updated lines preview:', updatedLines.slice(0, 3));
        
        if (updatedLines.length > 0) {
          setLineData(updatedLines);
        } else {
          console.log('**** UseLineData **** No valid lines with drafts found');
        }
      } else {
        console.log('**** UseLineData **** No lines found for script:', scriptId);
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
