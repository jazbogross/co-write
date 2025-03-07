
import { supabase } from '@/integrations/supabase/client';

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
    
    // Log the data for debugging
    console.log(`**** LineDataService **** Fetched ${data?.length || 0} lines from script_content`);
    if (data && data.length > 0) {
      // Log first few lines for debugging - safely access content with type guard
      data.slice(0, 3).forEach((line: any, i) => {
        // Make sure 'line' is an object and has a content property before accessing it
        if (line && typeof line === 'object') {
          const contentPreview = typeof line.content === 'string' 
            ? line.content.substring(0, 30) + '...'
            : 'Non-string content';
          
          console.log(`**** LineDataService **** Line ${i+1} content:`, contentPreview);
        } else {
          console.log(`**** LineDataService **** Line ${i+1} is not a valid object`);
        }
      });
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching line data:', error);
    throw error;
  }
};
