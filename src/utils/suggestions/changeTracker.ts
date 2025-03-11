
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
};

/**
 * Helper function to normalize a string by trimming whitespace and removing trailing newline.
 */
const normalizeLineText = (text: string): string => {
  return text.replace(/\n$/, '').trim();
};

/**
 * Compares current edited line data against the original content fetched directly
 * from the 'script_content' table.
 *
 * Note: The extra backslashes you see in the logged content (e.g.
 * "{\"ops\":[{\"insert\":\"again for you\\n\"}]}")
 * are simply escape characters from JSON.stringify and are normal.
 *
 * @param lineData - The current edited line data.
 * @param scriptId - The script identifier used to fetch the original content.
 * @param existingContentMap - A Map keyed by normalized original text, containing {uuid, lineNumber}.
 * @returns A Promise resolving to an array of ChangeRecord objects.
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
    // Build an array of normalized original texts.
    const originalLines = sortedOriginal.map(record => normalizeLineText(record.content));

    console.log('--- trackChanges ---');
    console.log('Original lines from DB:', originalLines);
    console.log('Current lineData length:', lineData.length);

    const changes: ChangeRecord[] = [];

    // Process every line in the current lineData.
    for (let i = 0; i < lineData.length; i++) {
      const currentLine = lineData[i];

      // Get the plain text for comparison.
      const currentContent = isDeltaObject(currentLine.content)
        ? normalizeLineText(extractPlainTextFromDelta(currentLine.content))
        : normalizeLineText(typeof currentLine.content === 'string' ? currentLine.content : '');

      console.log(`Comparing line ${i + 1}: current="${currentContent}" vs original="${originalLines[i] || '[none]'}"`);

      // Prepare the content to store.
      const contentToStore = normalizeContentForStorage(currentLine.content);
      console.log(`Line ${i + 1} content to store: ${contentToStore}`);

      // Look up any existing data using the normalized original text.
      const existingData = i < originalLines.length ? existingContentMap.get(originalLines[i]) : undefined;

      if (i < originalLines.length) {
        if (currentContent !== originalLines[i]) {
          changes.push({
            type: 'modified',
            lineNumber: currentLine.lineNumber,
            originalLineNumber: existingData ? existingData.lineNumber : i + 1,
            content: contentToStore,
            uuid: existingData ? existingData.uuid : currentLine.uuid
          });
          console.log(`Line ${i + 1} marked as MODIFIED`);
        } else {
          changes.push({
            type: 'unchanged',
            lineNumber: currentLine.lineNumber,
            originalLineNumber: existingData ? existingData.lineNumber : i + 1,
            content: contentToStore,
            uuid: existingData ? existingData.uuid : currentLine.uuid
          });
          console.log(`Line ${i + 1} marked as UNCHANGED`);
        }
      } else {
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
 *
 * @param lineData - The current edited line data.
 * @param originalRecords - The original line records fetched from the DB.
 * @returns An array of ChangeRecord objects for deleted lines.
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
