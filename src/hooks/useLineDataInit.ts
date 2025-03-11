import { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { LineData } from '@/types/lineTypes';
import { supabase } from '@/integrations/supabase/client';

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
        .from('line_drafts')
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
        const updatedLineData: LineData[] = drafts.map(draft => {
          const matchingLine = prevData.find(line => line.lineNumber === draft.line_number);

          // If there's a matching line, update it with the draft content
          if (matchingLine) {
            console.log(`useLineDataInit: Updating line ${draft.line_number} with draft content`);
            contentToUuidMapRef.current.set(draft.content, matchingLine.uuid);
            return {
              ...matchingLine,
              content: draft.content,
              hasDraft: true,
              editedBy: matchingLine.editedBy.includes(userId) ? matchingLine.editedBy : [...matchingLine.editedBy, userId]
            };
          } else {
            // If there's no matching line, create a new line with the draft content
            console.log(`useLineDataInit: Creating new line ${draft.line_number} with draft content`);
            const newUuid = uuidv4();
            contentToUuidMapRef.current.set(draft.content, newUuid);
            return {
              uuid: newUuid,
              lineNumber: draft.line_number,
              content: draft.content,
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
      const { data: lineData, error } = await supabase
        .from('script_content')
        .select('*')
        .eq('script_id', scriptId)
        .order('line_number', { ascending: true });

      if (error) {
        console.error('useLineDataInit: Error fetching script content:', error);
        return;
      }

      if (!lineData || lineData.length === 0) {
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

      const lines = lineData;

      // Process line data
      const processedLines = lines.map((l, index) => {
        if (!l) return null;
        
        const matchingLine = lineData.find(existing => existing.lineNumber === l.line_number);
        
        const newLine = {
          uuid: matchingLine?.uuid || uuidv4(),
          lineNumber: l.line_number || index + 1,
          content: matchingLine?.content || l.content || '',
          originalAuthor: matchingLine?.originalAuthor || userId || 'system',
          editedBy: matchingLine?.editedBy || [],
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
  }, [scriptId, originalContent]);

  return { 
    lineData, 
    setLineData, 
    isDataReady, 
    contentToUuidMapRef,
    lastLineCountRef,
    loadDrafts
  };
};
