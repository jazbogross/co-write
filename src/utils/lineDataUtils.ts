
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';

/**
 * Finds the best matching line in the previous line data based on content similarity
 */
export const findBestMatchingLine = (
  content: string,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  contentToUuidMap: Map<string, string>
): { index: number; similarity: number } | null => {
  const existingUuid = contentToUuidMap.get(content);
  if (existingUuid) {
    const exactMatchIndex = prevLineData.findIndex(line => line.uuid === existingUuid);
    if (exactMatchIndex >= 0 && !excludeIndices.has(exactMatchIndex)) {
      return { index: exactMatchIndex, similarity: 1 };
    }
  }
  
  let bestMatch = { index: -1, similarity: 0 };
  
  const calculateSimilarity = (a: string, b: string): number => {
    if (a === b) return 1;
    if (!a || !b) return 0;
    
    if (a.length > 10 && b.length > 10) {
      let matchLen = 0;
      const minLen = Math.min(a.length, b.length);
      while (matchLen < minLen && a[matchLen] === b[matchLen]) {
        matchLen++;
      }
      return matchLen / Math.max(a.length, b.length);
    }
    
    return a === b ? 1 : 0;
  };
  
  for (let i = 0; i < prevLineData.length; i++) {
    if (excludeIndices.has(i)) continue;
    
    const similarity = calculateSimilarity(content, prevLineData[i].content);
    
    if (similarity === 1) {
      return { index: i, similarity: 1 };
    }
    
    if (similarity > bestMatch.similarity && similarity > 0.5) {
      bestMatch = { index: i, similarity };
    }
  }
  
  return bestMatch.index >= 0 ? bestMatch : null;
};

/**
 * Fetches line data from Supabase for the given script
 */
export const fetchLineDataFromSupabase = async (scriptId: string) => {
  const { data, error } = await supabase
    .from('script_content')
    .select('*')
    .eq('script_id', scriptId)
    .order('line_number', { ascending: true });
    
  if (error) throw error;
  
  return data;
};

/**
 * Formats line data from Supabase response to LineData objects
 */
export const formatLineDataFromSupabase = (data: any[]) => {
  return data.map(line => ({
    uuid: line.id,
    lineNumber: line.line_number,
    content: line.content,
    originalAuthor: line.original_author || null,
    editedBy: Array.isArray(line.edited_by) ? line.edited_by.map(String) : [],
    draft: line.draft,
    lineNumberDraft: line.line_number_draft
  }));
};

/**
 * Creates initial line data for a new script
 */
export const createInitialLineData = (originalContent: string, userId: string | null): LineData[] => {
  const initialUuid = uuidv4();
  return [{
    uuid: initialUuid,
    lineNumber: 1,
    content: originalContent,
    originalAuthor: userId,
    editedBy: []
  }];
};
