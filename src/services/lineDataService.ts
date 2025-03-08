
import { supabase } from '@/integrations/supabase/client';
import { LineData } from '@/types/lineTypes';
import { processLinesData, processDraftLines } from '@/utils/lineDataProcessing';

/**
 * Fetches all lines for a specific script
 */
export const fetchAllLines = async (scriptId: string, isAdmin: boolean = false) => {
  try {
    // Select only necessary columns based on user role
    const columnSelection = isAdmin 
      ? 'id, line_number, line_number_draft, content, draft'
      : 'id, line_number, content';

    const { data, error } = await supabase
      .from('script_content')
      .select(columnSelection)
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
    console.log('loadDrafts aborted: missing scriptId or userId');
    return [];
  }
  
  console.log('Loading drafts for user:', userId);
  
  try {
    // Fetch all lines including drafts
    const allLines = await fetchAllLines(scriptId, true); // Pass isAdmin=true to get draft data
    
    if (!allLines || allLines.length === 0) {
      console.log('No lines found for script:', scriptId);
      return [];
    }
    
    // Type-safe check if any lines have draft content
    const hasDrafts = Array.isArray(allLines) && allLines.some((line: any) => {
      // Safely check for draft property
      return line && 
             typeof line === 'object' && 
             'draft' in line && 
             line.draft !== null && 
             line.draft !== '{deleted-uuid}';
    });
    
    if (!hasDrafts) {
      console.log('No drafts found for this script');
      return [];
    }
    
    // Process the lines with draft content - type safety assured by processLineData function
    const updatedLines = processDraftLines(allLines, contentToUuidMapRef);
    console.log(`Applied draft updates to ${updatedLines.length} lines`);
    
    if (updatedLines.length > 0) {
      return updatedLines;
    } else {
      console.log('No valid lines with drafts found');
    }
    
    return [];
  } catch (error) {
    console.error('Error loading drafts:', error);
    throw error;
  }
};
