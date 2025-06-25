import { supabase } from '@/integrations/supabase/client';
import { DeltaStatic } from 'quill';
import { LineData } from '@/types/lineTypes';
import { toDelta } from '@/utils/deltaUtils';
import { normalizeContentForStorage } from '@/utils/deltaUtils';

/**
 * Interface for suggestion submission
 */
interface SuggestionSubmission {
  scriptId: string;
  userId: string;
  deltaDiff: DeltaStatic;
}

/**
 * Creates a suggestion for a script
 */
export const saveSuggestions = async (
  scriptId: string,
  userId: string | null,
  lineData: LineData[]
): Promise<{ success: boolean; id?: string; error?: unknown }> => {
  if (!userId) {
    console.error('Cannot save suggestions without a user ID');
    return { success: false, error: 'No user ID provided' };
  }
  
  try {
    // Extract the Delta content from lineData
    const currentDelta = lineData.length > 0 ? lineData[0].content : null;
    
    if (!currentDelta) {
      console.error('No content to save');
      return { success: false, error: 'No content to save' };
    }
    
    // For now, we simply store the entire Delta as the diff
    // In a real implementation, you'd calculate an actual diff
    const deltaDiff = currentDelta;
    
    // Create the suggestion
    const suggestion: SuggestionSubmission = {
      scriptId,
      userId,
      deltaDiff: deltaDiff
    };
    
    // Normalize the delta to be Supabase-compatible
    const normalizedDelta = normalizeContentForStorage(suggestion.deltaDiff);
    
    // Get the current authenticated user to verify
    const { data: userData } = await supabase.auth.getUser();
    
    if (!userData || !userData.user) {
      console.error('No authenticated user found');
      return { success: false, error: 'Authentication required' };
    }
    
    // Make sure userId matches the authenticated user's ID
    if (userData.user.id !== userId) {
      console.error('User ID mismatch');
      return { success: false, error: 'User ID does not match authenticated user' };
    }
    
    console.log('Saving suggestion for script:', scriptId, 'by user:', userId);
    
    // Save to database using the authenticated user's ID
    const { data, error } = await supabase
      .from('script_suggestions')
      .insert({
        script_id: scriptId,
        user_id: userId,
        delta_diff: normalizedDelta,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving suggestion:', error);
      return { success: false, error };
    }
    
    console.log('Suggestion saved successfully with ID:', data.id);
    return { success: true, id: data.id };
  } catch (error) {
    console.error('Error in saveSuggestions:', error);
    return { success: false, error };
  }
};
