import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { findBestMatchingLine } from './lineMatching';

interface UseLineDataInitProps {
  scriptId: string;
  initialContent: string | null;
  userId?: string;
  isAdmin?: boolean;
}

export const useLineDataInit = ({
  scriptId,
  initialContent,
  userId,
  isAdmin = false
}: UseLineDataInitProps) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize line data from content
  useEffect(() => {
    const initializeLineData = async () => {
      if (isInitialized) return;
      
      setIsLoading(true);
      
      try {
        // First try to load existing line data from the database
        const { data: existingLines, error: fetchError } = await supabase
          .from('script_lines')
          .select('*')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });
          
        if (fetchError) throw fetchError;
        
        // Transform database rows to LineData format
        const existingLineData: LineData[] = existingLines?.map(line => ({
          uuid: line.uuid,
          lineNumber: line.line_number,
          content: line.content,
          originalAuthor: line.original_author,
          editedBy: line.edited_by || []
        })) || [];
        
        // If we have initial content but no existing lines, create new line data
        if (initialContent && (!existingLineData || existingLineData.length === 0)) {
          console.log('Creating new line data from initial content');
          
          // Split content by lines and create line data
          const contentLines = initialContent.split('\n');
          const newLineData: LineData[] = contentLines.map((line, index) => ({
            uuid: crypto.randomUUID(),
            lineNumber: index + 1,
            content: line,
            originalAuthor: userId || null,
            editedBy: []
          }));
          
          setLineData(newLineData);
        } else {
          // Use existing line data
          console.log(`Using ${existingLineData.length} existing lines from database`);
          setLineData(existingLineData);
        }
        
        setIsInitialized(true);
      } catch (err) {
        console.error('Error initializing line data:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    };
    
    if (scriptId && !isInitialized) {
      initializeLineData();
    }
  }, [scriptId, initialContent, userId, isInitialized]);
  
  // Function to update line data from editor content
  const updateLineDataFromContent = (content: string, domUuidMap?: Map<number, string>) => {
    if (!content) return;
    
    const contentLines = content.split('\n');
    const updatedLines: LineData[] = [];
    
    // Process each line of content
    contentLines.forEach((lineContent, index) => {
      // Check if we have an existing line at this index
      if (index < lineData.length) {
        updateExistingLine(
          index,
          lineContent,
          lineData,
          updatedLines,
          userId,
          domUuidMap
        );
      } else {
        // This is a new line
        const uuid = crypto.randomUUID();
        updatedLines.push({
          uuid,
          lineNumber: index + 1,
          content: lineContent,
          originalAuthor: userId || null,
          editedBy: []
        });
      }
    });
    
    // Update line data state
    setLineData(updatedLines);
    return updatedLines;
  };

  const findExistingLineMatch = (lineContent: string, existingLines: LineData[], lineIndex: number, domUuidMap?: Map<number, string>) => {
    if (!existingLines || existingLines.length === 0) {
      return null;
    }

    const matchResult = findBestMatchingLine(
      lineContent,
      existingLines,
      lineIndex,
      { domUuidMap }
    );
    
    return matchResult;
  };

  const updateExistingLine = (
    lineIndex: number,
    newContent: any,
    existingLines: LineData[],
    updatedLines: LineData[],
    userId: string | undefined,
    domUuidMap?: Map<number, string>
  ) => {
    const l = existingLines[lineIndex];
    const matchingLine = findExistingLineMatch(newContent, existingLines, lineIndex, domUuidMap);
    
    // Fixed null assertions - use proper null checks
    if (l && l.lineNumber) {
      updatedLines.push({
        ...l,
        content: newContent
      });
    } else if (matchingLine && matchingLine.uuid) {
      updatedLines.push({
        ...matchingLine,
        lineNumber: lineIndex + 1,
        content: newContent,
        editedBy: [...(matchingLine.editedBy || []), userId].filter(Boolean)
      });
    } else {
      // Create a new line with a new UUID
      const uuid = crypto.randomUUID();
      updatedLines.push({
        uuid,
        lineNumber: lineIndex + 1,
        content: newContent,
        originalAuthor: userId
      });
    }
  };
  
  // Function to save line data to the database
  const saveLineData = async () => {
    if (!scriptId || !lineData.length) return false;
    
    try {
      // Prepare data for upsert
      const linesToSave = lineData.map(line => ({
        script_id: scriptId,
        uuid: line.uuid,
        line_number: line.lineNumber,
        content: line.content,
        original_author: line.originalAuthor || null,
        edited_by: line.editedBy || []
      }));
      
      // Upsert all lines
      const { error } = await supabase
        .from('script_lines')
        .upsert(linesToSave, {
          onConflict: 'script_id,uuid'
        });
        
      if (error) throw error;
      
      return true;
    } catch (err) {
      console.error('Error saving line data:', err);
      return false;
    }
  };
  
  // Function to load drafts for the current user
  const loadDraftsForCurrentUser = async () => {
    if (!scriptId || !userId) return false;
    
    try {
      const { data: drafts, error } = await supabase
        .from('script_line_drafts')
        .select('*')
        .eq('script_id', scriptId)
        .eq('user_id', userId);
        
      if (error) throw error;
      
      if (!drafts || drafts.length === 0) {
        console.log('No drafts found for current user');
        return false;
      }
      
      // Apply drafts to line data
      const updatedLineData = [...lineData];
      
      drafts.forEach(draft => {
        const lineIndex = updatedLineData.findIndex(line => line.uuid === draft.line_uuid);
        
        if (lineIndex >= 0) {
          updatedLineData[lineIndex] = {
            ...updatedLineData[lineIndex],
            content: draft.draft_content,
            hasDraft: true,
            originalContent: updatedLineData[lineIndex].content
          };
        }
      });
      
      setLineData(updatedLineData);
      return true;
    } catch (err) {
      console.error('Error loading drafts:', err);
      return false;
    }
  };
  
  return {
    lineData,
    setLineData,
    isLoading,
    error,
    updateLineDataFromContent,
    saveLineData,
    loadDraftsForCurrentUser,
    isInitialized
  };
};
