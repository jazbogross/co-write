
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
 * Fetches all draft lines for a script
 */
export const fetchDraftLines = async (scriptId: string) => {
  try {
    const { data, error } = await supabase
      .from('script_content')
      .select('id, line_number, line_number_draft, content, draft')
      .eq('script_id', scriptId)
      .order('line_number', { ascending: true });
      
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching draft lines:', error);
    throw error;
  }
};

/**
 * Loads user drafts from the database
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
    // Reload all line data to ensure we have the latest drafts
    const draftLines = await fetchDraftLines(scriptId);
    
    if (draftLines && draftLines.length > 0) {
      // Process the draft lines
      const updatedLines = processDraftLines(draftLines, contentToUuidMapRef);
      
      console.log(`**** LineDataService **** Applied draft updates to ${updatedLines.length} lines`);
      
      if (updatedLines.length > 0) {
        return updatedLines;
      } else {
        console.log('**** LineDataService **** No valid lines with drafts found');
      }
    } else {
      console.log('**** LineDataService **** No lines found for script:', scriptId);
    }
    
    return [];
  } catch (error) {
    console.error('**** LineDataService **** Error loading drafts:', error);
    throw error;
  }
};
