import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';
import { isDeltaObject, safelyParseDelta } from '@/utils/editor';

export const useLineDataInit = (
  scriptId: string, 
  originalContent: string, 
  userId: string | null,
  isAdmin: boolean = false
) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isDataReady, setIsDataReady] = useState(false);
  const contentToUuidMapRef = useRef(new Map<string, string>());
  const lastLineCountRef = useRef(1);

  const loadDrafts = async (
    scriptId: string,
    userId: string | null,
    setLineData: React.Dispatch<React.SetStateAction<LineData[]>>,
    contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
  ) => {
    if (!scriptId || !userId) {
      console.log('useLineDataInit: No script ID or user ID provided, skipping draft load');
      return;
    }

    console.log(`useLineDataInit: Loading drafts for script ${scriptId} and user ${userId}`);

    try {
      const { data: drafts, error } = await supabase
        .from('script_drafts')
        .select('*')
        .eq('script_id', scriptId)
        .eq('user_id', userId)
        .order('line_number', { ascending: true });

      if (error) {
        console.error('useLineDataInit: Error fetching drafts:', error);
        return;
      }

      if (!drafts || drafts.length === 0) {
        console.log('useLineDataInit: No drafts found for this script and user');
        return;
      }

      console.log(`useLineDataInit: Found ${drafts.length} drafts`);

      // Update line data with drafts
      setLineData(prevData => {
        // Convert drafts to LineData format
        const updatedLineData: LineData[] = drafts.map(draft => {
          // Parse the content from JSON if it's stored as a string
          let draftContent: string | any = draft.content;
          
          if (typeof draftContent === 'string') {
            try {
              // Try to parse the content as JSON
              const parsedContent = JSON.parse(draftContent);
              if (isDeltaObject(parsedContent)) {
                draftContent = parsedContent;
              }
            } catch (e) {
              // If parsing fails, keep as string
              console.log('useLineDataInit: Failed to parse draft content as JSON, keeping as string');
            }
          }
          
          // Find a matching line in the previous data by line number if it exists
          const matchingLine = prevData.find(line => 
            line.lineNumber === (typeof draft.line_number === 'number' ? draft.line_number : -1)
          );

          // If there's a matching line, update it with the draft content
          if (matchingLine) {
            console.log(`useLineDataInit: Updating line ${draft.line_number} with draft content`);
            const contentStr = typeof draftContent === 'string' ? 
              draftContent : JSON.stringify(draftContent);
            contentToUuidMapRef.current.set(contentStr, matchingLine.uuid);
            
            return {
              ...matchingLine,
              content: draftContent,
              hasDraft: true,
              editedBy: matchingLine.editedBy.includes(userId) ? 
                matchingLine.editedBy : [...matchingLine.editedBy, userId]
            };
          } else {
            // If there's no matching line, create a new line with the draft content
            console.log(`useLineDataInit: Creating new line ${draft.line_number} with draft content`);
            const newUuid = uuidv4();
            const contentStr = typeof draftContent === 'string' ? 
              draftContent : JSON.stringify(draftContent);
            contentToUuidMapRef.current.set(contentStr, newUuid);
            
            return {
              uuid: newUuid,
              lineNumber: typeof draft.line_number === 'number' ? draft.line_number : 0,
              content: draftContent,
              originalAuthor: userId,
              editedBy: [],
              hasDraft: true
            };
          }
        });

        // Sort the updated line data by line number
        updatedLineData.sort((a, b) => a.lineNumber - b.lineNumber);
        return updatedLineData;
      });

    } catch (err) {
      console.error('useLineDataInit: Error loading drafts:', err);
    }
  };

  useEffect(() => {
    const loadInitialContent = async () => {
      if (!scriptId) {
        console.log('useLineDataInit: No script ID provided');
        return;
      }

      console.log(`useLineDataInit: Loading initial content for script ${scriptId}`);

      // Fetch initial content from script_content table
      const { data: scriptContent, error } = await supabase
        .from('script_content')
        .select('*')
        .eq('script_id', scriptId)
        .order('line_number', { ascending: true });

      if (error) {
        console.error('useLineDataInit: Error fetching script content:', error);
        return;
      }

      if (!scriptContent || scriptContent.length === 0) {
        console.log('useLineDataInit: No script content found, using original content');
        // If no data in script_content, create a single line with the original content
        const initialLine: LineData = {
          uuid: uuidv4(),
          lineNumber: 1,
          content: originalContent,
          originalAuthor: userId || 'system',
          editedBy: [],
          hasDraft: false
        };
        setLineData([initialLine]);
        setIsDataReady(true);
        return;
      }

      // Process line data
      const processedLines = scriptContent.map((line: any, index: number) => {
        if (!line) return null;
        
        const uuid = line.id || uuidv4();
        
        // Parse content from JSON if stored as a string
        let lineContent: string | any = line.content;
        if (typeof lineContent === 'string') {
          try {
            // Try to parse as JSON to get Delta objects
            const parsedContent = JSON.parse(lineContent);
            if (isDeltaObject(parsedContent)) {
              lineContent = parsedContent;
            }
          } catch (e) {
            // Keep as string if parsing fails
          }
        }
        
        // Convert edited_by from JSON array to string array
        let editedBy: string[] = [];
        if (line.edited_by) {
          try {
            const parsedEditedBy = Array.isArray(line.edited_by) ? 
              line.edited_by : JSON.parse(line.edited_by);
            editedBy = parsedEditedBy.map((id: any) => String(id));
          } catch (e) {
            console.error('useLineDataInit: Error parsing edited_by:', e);
            editedBy = [];
          }
        }
        
        const newLine: LineData = {
          uuid: uuid,
          lineNumber: line.line_number || index + 1,
          content: lineContent,
          originalAuthor: line.original_author || userId || 'system',
          editedBy: editedBy,
          hasDraft: false
        };

        return newLine;
      }).filter((line): line is LineData => line !== null);

      setLineData(processedLines);
      setIsDataReady(true);
    };

    // Load initial content only once when the component mounts
    if (scriptId) {
      loadInitialContent();
    }

    // Cleanup function (optional)
    return () => {
      // Any cleanup logic here
    };
  }, [scriptId, originalContent, userId]);

  return { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts
  };
};
