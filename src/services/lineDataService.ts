
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineDataProcessing';

/**
 * Fetches all lines for a specific script
 */
export const fetchAllLines = async (scriptId: string) => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('id, line_number, line_number_draft, content, draft')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching line data:', error);
    throw error;
  }
};

/**
 * Loads user drafts from the database and returns processed line data
 */
export const loadDrafts = async (
  scriptId: string,
  userId: string | null,
  contentToUuidMapRef: React.MutableRefObject<Map<string, string>>
): Promise<LineData[]> => {
  if (!scriptId || !userId) {
    console.log('**** LineDataService **** loadDrafts aborted: missing scriptId or userId');
    return [];
  }
  
  console.log('**** LineDataService **** Loading drafts for user:', userId);
  
  try {
    // Fetch all lines including drafts
    const allLines = await fetchAllLines(scriptId);
    
    if (!allLines || allLines.length === 0) {
      console.log('**** LineDataService **** No lines found for script:', scriptId);
      return [];
    }
    
    // Check if any lines have draft content
    const hasDrafts = allLines.some(line => 
      line.draft !== null || line.line_number_draft !== null
    );
    
    if (!hasDrafts) {
      console.log('**** LineDataService **** No drafts found for this script');
      return [];
    }
    
    // Process the lines with draft content
    const updatedLines = processDraftLines(allLines, contentToUuidMapRef);
    console.log(`**** LineDataService **** Applied draft updates to ${updatedLines.length} lines`);
    
    if (updatedLines.length > 0) {
      return updatedLines;
    } else {
      console.log('**** LineDataService **** No valid lines with drafts found');
    }
    
    return [];
  } catch (error) {
    console.error('**** LineDataService **** Error loading drafts:', error);
    throw error;
  }
};
