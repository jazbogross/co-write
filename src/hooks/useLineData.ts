
import { useState, useEffect } from 'react';
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
        } else {
          // Initialize with original content if no data in database
          const lines = originalContent.split('\n');
          const initialLineData = lines.map((line, index) => ({
            uuid: uuidv4(),
            lineNumber: index + 1,
            content: line,
            originalAuthor: userId,
            editedBy: []
          }));
          setLineData(initialLineData);
        }
        setInitialized(true);
      } catch (error) {
        console.error('Error fetching line data:', error);
        setInitialized(true);
      }
    };

    fetchLineData();
  }, [scriptId, originalContent, userId, initialized]);

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

  return { lineData, setLineData, updateLineContent };
};
