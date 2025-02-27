
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

  useEffect(() => {
    const fetchLineData = async () => {
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
            editedBy: Array.isArray(line.edited_by) ? line.edited_by.map(String) : []
          }));
          
          setLineData(formattedLineData);
        } else {
          initializeLineData();
        }
      } catch (error) {
        console.error('Error fetching line data:', error);
        initializeLineData();
      }
    };

    const initializeLineData = () => {
      const lines = originalContent.split('\n');
      const initialLineData = lines.map((line, index) => ({
        uuid: uuidv4(),
        lineNumber: index + 1,
        content: line,
        originalAuthor: userId,
        editedBy: []
      }));
      setLineData(initialLineData);
    };

    fetchLineData();
  }, [scriptId, originalContent, userId]);

  const updateLineContent = (lineIndex: number, newContent: string) => {
    setLineData(prevData => {
      const newData = [...prevData];
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
