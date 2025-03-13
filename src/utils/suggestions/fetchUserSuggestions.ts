
import { supabase } from '@/integrations/supabase/client';

/**
 * Fetch suggestions made by a specific user for a script
 */
export const fetchUserSuggestions = async (scriptId: string, userId: string) => {
  try {
    console.log('🔍 Fetching suggestions for user:', userId);
    
    const { data, error } = await supabase
      .from('script_suggestions')
      .select(`
        id,
        delta_diff,
        status,
        rejection_reason,
        created_at,
        updated_at,
        profiles (username)
      `)
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
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
