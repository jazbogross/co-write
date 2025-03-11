
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/hooks/useLineData';
import { normalizeContentForStorage } from './contentUtils';
import { isDeltaObject, extractPlainTextFromDelta } from '@/utils/editor';

export interface ChangeRecord {
  type: 'modified' | 'added' | 'deleted' | 'unchanged';
  lineNumber: number;
  originalLineNumber?: number;
  content: string;
  uuid?: string;
}

/**
 * Fetches original line records directly from the 'script_content' table
 * for a given script.
 */
const fetchOriginalContent = async (scriptId: string): Promise<{ line_number: number; content: string; id: string }[]> => {
  console.log(`fetchOriginalContent: Received scriptId: "${scriptId}" (type: ${typeof scriptId})`);
  if (!scriptId || scriptId.trim() === "") {
    console.warn("fetchOriginalContent: scriptId is empty, returning empty array");
    return []; // Return empty array instead of throwing an error
  }
  
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('line_number, content, id')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (error) {
      console.error('Error fetching original content:', error);
      return []; // Return empty array on error
    }
    
    console.log('fetchOriginalContent: Data received:', JSON.stringify(data, null, 2));
    return data || [];
  } catch (e) {
    console.error('Error in fetchOriginalContent:', e);
    return [];
  }
};

/**
 * Normalize content for proper comparison regardless of string escape format
 */
const normalizeForComparison = (content: string): string => {
  try {
    // If it's already a JSON string, parse it and re-stringify to ensure consistent format
    const parsed = JSON.parse(content);
    
    // For Delta objects, extract text content for comparison
    if (typeof parsed === 'object' && parsed !== null && 'ops' in parsed) {
      return extractPlainTextFromDelta(parsed).trim();
    }
    
    // For other JSON objects, just use consistent stringification
    return JSON.stringify(parsed);
  } catch (e) {
    // Not a valid JSON string, return as-is
    return content.trim();
  }
};

/**
 * Compares current edited line data against the original content fetched directly
 * from the 'script_content' table.
 */
export const trackChanges = async (
  lineData: LineData[],
  scriptId: string,
  existingContentMap: Map<string, { uuid: string; lineNumber: number }>
): Promise<ChangeRecord[]> => {
  try {
    // Fetch the original records from the database.
    const originalRecords = await fetchOriginalContent(scriptId);
    
    // Sort the original records by line_number.
    const sortedOriginal = originalRecords.sort((a, b) => a.line_number - b.line_number);
    
    console.log('--- trackChanges ---');
    console.log('Original lines from DB:', sortedOriginal.length);
    console.log('Current lineData length:', lineData.length);

    const changes: ChangeRecord[] = [];

    // Process every line in the current lineData.
    for (let i = 0; i < lineData.length; i++) {
      const currentLine = lineData[i];
      
      // Prepare the content to store.
      const contentToStore = normalizeContentForStorage(currentLine.content);
      
      // Get the original content for this line if it exists
      const originalContent = i < sortedOriginal.length ? sortedOriginal[i].content : null;
      
      if (i < sortedOriginal.length) {
        // Both lines exist - compare their content
        const currentNormalized = normalizeForComparison(contentToStore);
        const originalNormalized = normalizeForComparison(originalContent || '');
        
        console.log(`Line ${i + 1} comparison:`, {
          current: currentNormalized.substring(0, 20) + '...',
          original: originalNormalized.substring(0, 20) + '...',
          isEqual: currentNormalized === originalNormalized
        });
        
        if (currentNormalized !== originalNormalized) {
          changes.push({
            type: 'modified',
            lineNumber: currentLine.lineNumber,
            originalLineNumber: sortedOriginal[i].line_number,
            content: contentToStore,
            uuid: sortedOriginal[i].id
          });
          console.log(`Line ${i + 1} marked as MODIFIED`);
        } else {
          changes.push({
            type: 'unchanged',
            lineNumber: currentLine.lineNumber,
            originalLineNumber: sortedOriginal[i].line_number,
            content: contentToStore,
            uuid: sortedOriginal[i].id
          });
          console.log(`Line ${i + 1} marked as UNCHANGED`);
        }
      } else {
        // This line doesn't exist in the original content - it's an addition
        changes.push({
          type: 'added',
          lineNumber: currentLine.lineNumber,
          content: contentToStore,
          uuid: currentLine.uuid
        });
        console.log(`Line ${i + 1} marked as ADDED`);
      }
    }
    
    console.log('Final change records:', JSON.stringify(changes, null, 2));
    return changes;
  } catch (error) {
    console.error('Error in trackChanges:', error);
    return []; // Return empty array instead of letting the error propagate
  }
};

/**
 * Identifies deleted lines by comparing current line UUIDs with the original records.
 */
export const trackDeletedLines = (
  lineData: LineData[],
  originalRecords: { line_number: number; content: string; id: string }[]
): ChangeRecord[] => {
  const deletedLines: ChangeRecord[] = [];
  
  if (!originalRecords || !Array.isArray(originalRecords)) return deletedLines;
  
  // Build a set of current line UUIDs.
  const currentLineUUIDs = new Set(lineData.map(line => line.uuid));
  
  for (const record of originalRecords) {
    if (record.id && !currentLineUUIDs.has(record.id)) {
      deletedLines.push({
        type: 'deleted',
        lineNumber: record.line_number,
        originalLineNumber: record.line_number,
        content: '',
        uuid: record.id
      });
      console.log(`Line with UUID ${record.id} marked as DELETED`);
    }
  }
  
  return deletedLines;
};
