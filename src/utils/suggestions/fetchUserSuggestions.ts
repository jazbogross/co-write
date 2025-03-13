
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch user suggestions from the database
 */
export const fetchUserSuggestions = async (
  scriptId: string,
  userId: string,
  signal?: AbortSignal
): Promise<any[]> => {
  try {
    // Query for all drafts for this user on this script
    const { data, error } = await supabase
      .from('script_suggestions')
      .select('*')
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'draft');
    
    if (error) {
      console.error('Error fetching user suggestions:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchUserSuggestions:', error);
    return [];
  }
};
