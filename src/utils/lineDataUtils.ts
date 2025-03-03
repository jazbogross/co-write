
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { getPlainTextContent } from '@/hooks/lineMatching/contentUtils';

/**
 * Finds the best matching line in the previous line data based on content similarity
 */
export const findBestMatchingLine = (
  content: string,
  prevLineData: LineData[],
  excludeIndices: Set<number>,
  contentToUuidMap: Map<string, string>
): { index: number; similarity: number } | null => {
  // Convert content to plain text if it's a Delta object
  const plainTextContent = getPlainTextContent(content);
  
  const existingUuid = contentToUuidMap.get(plainTextContent);
  if (existingUuid) {
    const exactMatchIndex = prevLineData.findIndex(line => line.uuid === existingUuid);
    if (exactMatchIndex >= 0 && !excludeIndices.has(exactMatchIndex)) {
      return { index: exactMatchIndex, similarity: 1 };
    }
  }
  
  let bestMatch = { index: -1, similarity: 0 };
  
  const calculateSimilarity = (a: string, b: string | any): number => {
    // Convert b to plain text if it's a Delta object
    const plainTextB = getPlainTextContent(b);
    
    if (a === plainTextB) return 1;
    if (!a || !plainTextB) return 0;
    
    if (a.length > 10 && plainTextB.length > 10) {
      let matchLen = 0;
      const minLen = Math.min(a.length, plainTextB.length);
      while (matchLen < minLen && a[matchLen] === plainTextB[matchLen]) {
        matchLen++;
      }
      return matchLen / Math.max(a.length, plainTextB.length);
    }
    
    return a === plainTextB ? 1 : 0;
  };
  
  for (let i = 0; i < prevLineData.length; i++) {
    if (excludeIndices.has(i)) continue;
    
    const similarity = calculateSimilarity(plainTextContent, prevLineData[i].content);
    
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
