
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

export interface LineData {
  uuid: string;
  lineNumber: number;
  content: string;
  originalAuthor: string | null;
  editedBy: string[];
}

export const useLineData = (scriptId: string, originalContent: string, userId: string | null) => {
  const [lineData, setLineData] = useState<LineData[]>([]);
  const [initialized, setInitialized] = useState(false);
  const previousContentRef = useRef<string[]>([]);

  useEffect(() => {
    const fetchLineData = async () => {
      if (!scriptId || initialized) return;

      try {
        const { data, error } = await supabase
          .from('script_content')
          .select('*')
          .eq('script_id', scriptId)
          .order('line_number', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const formattedLineData = data.map(line => ({
            uuid: line.id,
            lineNumber: line.line_number,
            content: line.content,
            originalAuthor: line.original_author || null,
            // Ensure editedBy is always a string array
            editedBy: Array.isArray(line.edited_by) ? line.edited_by.map(String) : []
          }));
          
          setLineData(formattedLineData);
          // Store the current content lines for future reference
          previousContentRef.current = formattedLineData.map(line => line.content);
        } else {
          // Initialize with original content if no data in database
          // Here, instead of splitting by newline which would strip formatting,
          // we'll create a single line to preserve the original formatting
          // This prevents formatting loss for new content
          const initialLineData = [{
            uuid: uuidv4(),
            lineNumber: 1,
            content: originalContent, // Preserve the entire original content with formatting
            originalAuthor: userId,
            editedBy: []
          }];
          
          setLineData(initialLineData);
          // Store the current content for future reference
          previousContentRef.current = [originalContent];
        }
        setInitialized(true);
      } catch (error) {
        console.error('Error fetching line data:', error);
        setInitialized(true);
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized]);

  // Function to find the best matching line based on content similarity
  const findBestMatchingLine = (
    content: string, 
    prevLineData: LineData[], 
    excludeIndices: Set<number>
  ): { index: number, similarity: number } | null => {
    let bestMatch = { index: -1, similarity: 0 };
    
    // Simple similarity measure (can be improved)
    const calculateSimilarity = (a: string, b: string): number => {
      if (a === b) return 1;
      if (!a || !b) return 0;
      
      // For longer strings, use a more sophisticated algorithm
      if (a.length > 10 && b.length > 10) {
        // Count matching characters at the start
        let matchLen = 0;
        const minLen = Math.min(a.length, b.length);
        while (matchLen < minLen && a[matchLen] === b[matchLen]) {
          matchLen++;
        }
        return matchLen / Math.max(a.length, b.length);
      }
      
      // For short strings, exact match or nothing
      return a === b ? 1 : 0;
    };
    
    for (let i = 0; i < prevLineData.length; i++) {
      if (excludeIndices.has(i)) continue;
      
      const similarity = calculateSimilarity(content, prevLineData[i].content);
      
      // If exact match, return immediately
      if (similarity === 1) {
        return { index: i, similarity: 1 };
      }
      
      // If better than previous match, update
      if (similarity > bestMatch.similarity && similarity > 0.6) {
        bestMatch = { index: i, similarity };
      }
    }
    
    return bestMatch.index >= 0 ? bestMatch : null;
  };

  const updateLineContents = (newContents: string[], quill: any) => {
    setLineData(prevData => {
      const usedIndices = new Set<number>();
      const newData: LineData[] = [];
      
      // For each new line, try to find a matching line in the previous state
      for (let i = 0; i < newContents.length; i++) {
        const content = newContents[i];
        
        // Try to find a match in the previous state
        const match = findBestMatchingLine(content, prevData, usedIndices);
        
        if (match) {
          // Use the existing line data with updated content
          const matchIndex = match.index;
          usedIndices.add(matchIndex);
          
          newData.push({
            ...prevData[matchIndex],
            lineNumber: i + 1,
            content,
            editedBy: content !== prevData[matchIndex].content && userId && 
                     !prevData[matchIndex].editedBy.includes(userId)
              ? [...prevData[matchIndex].editedBy, userId]
              : prevData[matchIndex].editedBy
          });
        } else {
          // Create a new line
          newData.push({
            uuid: uuidv4(),
            lineNumber: i + 1,
            content,
            originalAuthor: userId,
            editedBy: []
          });
        }
      }
      
      // Store the current content for future reference
      previousContentRef.current = newContents;
      
      return newData;
    });
  };

  // Legacy method for backward compatibility
  const updateLineContent = (lineIndex: number, newContent: string) => {
    setLineData(prevData => {
      const newData = [...prevData];
      
      // Ensure we're not exceeding array bounds
      while (newData.length <= lineIndex) {
        newData.push({
          uuid: uuidv4(),
          lineNumber: newData.length + 1,
          content: '',
          originalAuthor: userId,
          editedBy: []
        });
      }
      
      // Only update content and editedBy, preserve UUID and other metadata
      if (newData[lineIndex]) {
        newData[lineIndex] = {
          ...newData[lineIndex],
          content: newContent,
          editedBy: userId && !newData[lineIndex].editedBy.includes(userId)
            ? [...newData[lineIndex].editedBy, userId]
            : newData[lineIndex].editedBy
        };
      }
      
      return newData;
    });
  };

  return { lineData, setLineData, updateLineContent, updateLineContents };
};
