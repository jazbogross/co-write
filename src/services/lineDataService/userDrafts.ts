
import { supabase } from '@/integrations/supabase/client';

/**
 * Check if user has any drafts in script_suggestions table
 */
export const checkForUserDrafts = async (scriptId: string, userId: string) => {
  try {
    const { count, error } = await supabase
      .from('script_suggestions')
      .select('*', { count: 'exact', head: true })
      .eq('script_id', scriptId)
      .eq('user_id', userId)
      .eq('status', 'pending');
      
    if (error) throw error;
    console.log(`**** LineDataService **** Found ${count || 0} pending suggestions for user ${userId}`);
    return count && count > 0;
  } catch (error) {
    console.error('Error checking for user drafts:', error);
    return false;
  }
};
